// API route for matching brand names to BigCommerce brand IDs
import brands from '../../data/bigcommerce_brands.json';

// Common brand synonyms/aliases → canonical brand key in bigcommerce_brands.json
const BRAND_ALIASES = {
  'a-b': 'allen bradley',
  'ab': 'allen bradley',
  'allen-bradley': 'allen bradley',
  'rockwell': 'allen bradley',
  'rockwell automation': 'allen bradley',
  'baldor-reliance': 'baldor',
  'baldor reliance': 'baldor',
  'abb baldor': 'baldor',
  'cutler hammer': 'cutler-hammer',
  'eaton cutler-hammer': 'cutler-hammer',
  'eaton cutler hammer': 'cutler-hammer',
  'ge fanuc': 'ge-fanuc',
  'ge-fanuc': 'ge-fanuc',
  'pepperl+fuchs': 'pepperl fuchs',
  'pepperl fuchs': 'pepperl fuchs',
  'p+f': 'pepperl fuchs',
  'schneider': 'schneider electric',
  'square-d': 'square d',
  'telemecanique': 'schneider electric',
  'reliance': 'reliance electric',
  'us motors': 'us electrical motors',
  'u.s. motors': 'us electrical motors',
  'danfoss vlt': 'danfoss',
  'mitsubishi electric': 'mitsubishi',
  'phoenix': 'phoenix contact',
  'ifm': 'ifm efector',
  'ifm electronic': 'ifm efector',
  'fag': 'fag inc.',
  'nachi fujikoshi': 'nachi-fujikoshi corp.',
  'nsk ltd': 'nsk',
};

/**
 * Strip common corporate suffixes and punctuation
 */
function normalizeBrand(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[,.]+$/g, '')
    .replace(/\s+(inc\.?|llc\.?|corp\.?|ltd\.?|limited|incorporated|co\.?|company|gmbh|ag|s\.?a\.?)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simple Levenshtein distance for fuzzy matching
 */
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brandName } = req.body;

  if (!brandName) {
    return res.status(400).json({ error: 'Brand name required' });
  }

  try {
    const searchTerm = brandName.toLowerCase().trim();
    const normalized = normalizeBrand(brandName);
    const allBrands = Object.entries(brands);
    let match = null;
    let matchMethod = '';

    // 1. Exact match on raw search term
    if (brands[searchTerm]) {
      match = brands[searchTerm];
      matchMethod = 'exact';
    }

    // 2. Exact match on normalized form
    if (!match && brands[normalized]) {
      match = brands[normalized];
      matchMethod = 'normalized';
    }

    // 3. Check alias table
    if (!match) {
      const aliasKey = BRAND_ALIASES[normalized] || BRAND_ALIASES[searchTerm];
      if (aliasKey && brands[aliasKey]) {
        match = brands[aliasKey];
        matchMethod = 'alias';
      }
    }

    // 4. Normalize both sides and compare (strip suffixes from brand keys too)
    if (!match) {
      const found = allBrands.find(([key]) => normalizeBrand(key) === normalized);
      if (found) {
        match = found[1];
        matchMethod = 'normalized-both';
      }
    }

    // 5. Try first part of hyphenated name (e.g., "Baldor-Reliance" → "Baldor")
    if (!match && (normalized.includes('-') || normalized.includes(' '))) {
      const firstPart = normalized.split(/[-\s]/)[0];
      if (firstPart.length >= 3 && brands[firstPart]) {
        match = brands[firstPart];
        matchMethod = 'first-word';
      }
    }

    // 6. Word-boundary partial match (brand key starts with search term or vice versa)
    //    Only match if the shorter string is at least 3 chars and matches a word boundary
    if (!match && normalized.length >= 3) {
      const found = allBrands.find(([key]) => {
        const normKey = normalizeBrand(key);
        // Search term starts with brand key (e.g., search "skf bearings" matches "skf")
        if (normalized.startsWith(normKey + ' ') && normKey.length >= 3) return true;
        // Brand key starts with search term (e.g., search "timken" matches "timken fafnir")
        if (normKey.startsWith(normalized + ' ') && normalized.length >= 3) return true;
        return false;
      });
      if (found) {
        match = found[1];
        matchMethod = 'word-boundary';
      }
    }

    // 7. Fuzzy match (Levenshtein distance <= 2, only for brands 4+ chars)
    if (!match && normalized.length >= 4) {
      let bestDist = Infinity;
      let bestMatch = null;
      for (const [key, value] of allBrands) {
        const normKey = normalizeBrand(key);
        // Only compare brands of similar length (within 3 chars)
        if (Math.abs(normKey.length - normalized.length) > 3) continue;
        const dist = levenshtein(normalized, normKey);
        // Max distance: 1 for very short brands (4 chars), 2 for 5+ chars
        const maxDist = normalized.length <= 4 ? 1 : 2;
        if (dist <= maxDist && dist < bestDist) {
          bestDist = dist;
          bestMatch = { key, value };
        }
      }
      if (bestMatch) {
        match = bestMatch.value;
        matchMethod = 'fuzzy';
      }
    }

    if (!match) {
      return res.status(200).json({
        success: true,
        match: null,
        needsCreation: true,
        brandName: brandName
      });
    }

    res.status(200).json({
      success: true,
      match: {
        name: match.name,
        id: match.id
      },
      needsCreation: false,
      matchMethod
    });

  } catch (error) {
    console.error('Brand matching error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
