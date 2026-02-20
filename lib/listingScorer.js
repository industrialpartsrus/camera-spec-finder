// ============================================================
// /lib/listingScorer.js
// Listing quality scoring engine
// Takes a SureDone listing object, returns score 0-100
// ============================================================

export function scoreListingQuality(item) {
  let score = 100;
  const issues = [];
  const details = {};

  // ============================================
  // TITLE QUALITY (max -25)
  // ============================================
  const title = (item.title || '').trim();
  details.title = { value: title, deductions: 0 };

  if (!title) {
    score -= 25;
    issues.push({ field: 'title', severity: 'critical', message: 'No title' });
    details.title.deductions = 25;
  } else {
    if (title.length < 40) {
      score -= 10;
      issues.push({ field: 'title', severity: 'warning', message: `Title too short (${title.length} chars)` });
      details.title.deductions += 10;
    }
    if (title === title.toUpperCase() && title.length > 10) {
      score -= 5;
      issues.push({ field: 'title', severity: 'minor', message: 'Title is ALL CAPS' });
      details.title.deductions += 5;
    }
    const brand = (item.brand || '').trim();
    if (brand && !title.toLowerCase().includes(brand.toLowerCase())) {
      score -= 5;
      issues.push({ field: 'title', severity: 'warning', message: 'Brand not in title' });
      details.title.deductions += 5;
    }
    const mpn = (item.mpn || '').trim();
    if (mpn && !title.toLowerCase().includes(mpn.toLowerCase())) {
      score -= 5;
      issues.push({ field: 'title', severity: 'warning', message: 'Part number not in title' });
      details.title.deductions += 5;
    }
    const genericTerms = ['industrial part', 'used part', 'electronic', 'module', 'unit', 'item'];
    const titleLower = title.toLowerCase();
    if (genericTerms.some(term => titleLower === term || titleLower === `used ${term}`)) {
      score -= 10;
      issues.push({ field: 'title', severity: 'warning', message: 'Generic/vague title' });
      details.title.deductions += 10;
    }
  }

  // ============================================
  // DESCRIPTION QUALITY (max -20)
  // ============================================
  const desc = (item.longdescription || item.description || '').trim();
  const descText = desc.replace(/<[^>]*>/g, ' ').trim();
  details.description = { length: descText.length, deductions: 0 };

  if (!descText) {
    score -= 20;
    issues.push({ field: 'description', severity: 'critical', message: 'No description' });
    details.description.deductions = 20;
  } else if (descText.length < 50) {
    score -= 15;
    issues.push({ field: 'description', severity: 'warning', message: `Description too short (${descText.length} chars)` });
    details.description.deductions = 15;
  } else if (descText.length < 150) {
    score -= 8;
    issues.push({ field: 'description', severity: 'minor', message: 'Description could be more detailed' });
    details.description.deductions = 8;
  }

  if (descText && title && descText.toLowerCase().trim() === title.toLowerCase().trim()) {
    score -= 10;
    issues.push({ field: 'description', severity: 'warning', message: 'Description is just the title repeated' });
    details.description.deductions += 10;
  }

  // ============================================
  // PHOTO QUALITY (max -25)
  // ============================================
  let photoCount = 0;
  for (let i = 1; i <= 12; i++) {
    const url = item[`media${i}`];
    if (url && url.trim() && !url.includes('no-image') && !url.includes('placeholder')) {
      photoCount++;
    }
  }
  details.photos = { count: photoCount, deductions: 0 };

  if (photoCount === 0) {
    score -= 25;
    issues.push({ field: 'photos', severity: 'critical', message: 'No photos' });
    details.photos.deductions = 25;
  } else if (photoCount === 1) {
    score -= 15;
    issues.push({ field: 'photos', severity: 'warning', message: 'Only 1 photo' });
    details.photos.deductions = 15;
  } else if (photoCount === 2) {
    score -= 8;
    issues.push({ field: 'photos', severity: 'minor', message: 'Only 2 photos (recommend 4+)' });
    details.photos.deductions = 8;
  }

  // ============================================
  // ITEM SPECIFICS (max -15)
  // ============================================
  let specsCount = 0;
  for (const key in item) {
    if (key.startsWith('ebayitemspecifics') && item[key] &&
        item[key].toString().trim() &&
        key !== 'ebayitemspecificsbrand' &&
        key !== 'ebayitemspecificsmpn') {
      specsCount++;
    }
  }
  details.specs = { count: specsCount, deductions: 0 };

  if (specsCount === 0) {
    score -= 15;
    issues.push({ field: 'specs', severity: 'warning', message: 'No eBay item specifics' });
    details.specs.deductions = 15;
  } else if (specsCount < 3) {
    score -= 10;
    issues.push({ field: 'specs', severity: 'minor', message: `Only ${specsCount} item specifics (recommend 5+)` });
    details.specs.deductions = 10;
  } else if (specsCount < 5) {
    score -= 5;
    issues.push({ field: 'specs', severity: 'minor', message: `${specsCount} item specifics (recommend 5+)` });
    details.specs.deductions = 5;
  }

  // ============================================
  // BRAND & MPN (max -10)
  // ============================================
  if (!item.brand || !item.brand.trim()) {
    score -= 5;
    issues.push({ field: 'brand', severity: 'warning', message: 'No brand' });
  }
  if (!item.mpn || !item.mpn.trim()) {
    score -= 5;
    issues.push({ field: 'mpn', severity: 'warning', message: 'No part number (MPN)' });
  }

  // ============================================
  // CATEGORY (max -10)
  // ============================================
  if (!item.ebaycatid || item.ebaycatid === '0') {
    score -= 10;
    issues.push({ field: 'category', severity: 'warning', message: 'No eBay category set' });
  }

  // ============================================
  // PRICE (max -5)
  // ============================================
  const price = parseFloat(item.price) || 0;
  if (price <= 0) {
    score -= 5;
    issues.push({ field: 'price', severity: 'warning', message: 'No price or $0' });
  }

  // ============================================
  // CONDITION (max -5)
  // ============================================
  if (!item.condition || !item.condition.trim()) {
    score -= 5;
    issues.push({ field: 'condition', severity: 'minor', message: 'No condition set' });
  }

  score = Math.max(0, Math.min(100, score));

  const critical = issues.filter(i => i.severity === 'critical').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const minor = issues.filter(i => i.severity === 'minor').length;

  return {
    score,
    grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F',
    issues,
    issueCount: { critical, warnings, minor },
    details,
    photoCount,
    specsCount,
    price,
  };
}

// ============================================
// PRIORITY CALCULATOR
// Combines quality score with price and listing age
// Higher number = higher priority for refresh
// ============================================
export function calculateRefreshPriority(item, qualityResult) {
  const price = qualityResult.price || 0;
  const score = qualityResult.score;

  let ageMonths = 0;
  const created = item.datecreated || item.created_at || item.date;
  if (created) {
    const createdDate = new Date(created);
    if (!isNaN(createdDate.getTime())) {
      ageMonths = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    }
  }

  let ageFactor = 1.0;
  if (ageMonths > 12) ageFactor = 3.0;
  else if (ageMonths > 6) ageFactor = 2.0;
  else if (ageMonths > 3) ageFactor = 1.5;

  const priceFactor = Math.max(1, Math.log10(Math.max(price, 1)) * 2);
  const priority = (100 - score) * priceFactor * ageFactor;

  return {
    priority: Math.round(priority * 100) / 100,
    ageMonths: Math.round(ageMonths * 10) / 10,
    ageFactor,
    priceFactor: Math.round(priceFactor * 100) / 100,
  };
}
