// lib/ebay-aspects.js
// =============================================================================
// Shared, in-process eBay category aspects fetcher — NO self-HTTP call.
// Used by:
//   - pages/api/ebay-category-aspects.js  (thin HTTP endpoint wrapper)
//   - pages/api/search-product-v2.js      (Pass 1, calls directly in-process)
// Fetches live item specifics (aspects) from eBay's Taxonomy API, formats them
// into required/recommended/optional, caches per-instance for 24h, and retries
// transient failures instead of silently returning nothing.
// =============================================================================
import { getEbayToken } from '../pages/api/ebay-token';

const aspectsCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function getCategoryAspects(categoryId, { retries = 2 } = {}) {
  if (!categoryId) throw new Error('categoryId is required');

  const cacheKey = `category_${categoryId}`;
  const cached = aspectsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`Using cached aspects for category ${categoryId}`);
    return cached.data;
  }

  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const token = await getEbayToken();
      const url = `https://api.ebay.com/commerce/taxonomy/v1/category_tree/0/get_item_aspects_for_category?category_id=${categoryId}`;
      console.log(`Fetching aspects for category ${categoryId} from eBay... (attempt ${attempt + 1}/${retries + 1})`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`eBay Taxonomy API ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      const formatted = formatAspects(data, categoryId);
      aspectsCache.set(cacheKey, { timestamp: Date.now(), data: formatted });
      return formatted;
    } catch (err) {
      lastErr = err;
      console.warn(`Aspect fetch attempt ${attempt + 1} failed for ${categoryId}: ${err.message}`);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
  throw lastErr || new Error('Failed to fetch category aspects');
}

function formatAspects(apiResponse, categoryId) {
  if (!apiResponse.aspects) {
    return { categoryId, totalAspects: 0, required: [], recommended: [], optional: [], all: [] };
  }
  const aspects = apiResponse.aspects.map(aspect => {
    const name = aspect.localizedAspectName;
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return {
      ebayName: name,
      suredoneInlineField: cleanName,
      suredoneDynamicField: 'ebayitemspecifics' + cleanName,
      required: aspect.aspectConstraint?.aspectRequired || false,
      usage: aspect.aspectConstraint?.aspectUsage || 'OPTIONAL',
      mode: aspect.aspectConstraint?.aspectMode || 'FREE_TEXT',
      dataType: aspect.aspectConstraint?.aspectDataType || 'STRING',
      allowedValues: aspect.aspectValues?.map(v => v.localizedValue) || [],
      multiValue: aspect.aspectConstraint?.itemToAspectCardinality === 'MULTI'
    };
  });
  const required = aspects.filter(a => a.required);
  const recommended = aspects.filter(a => !a.required && a.usage === 'RECOMMENDED');
  const optional = aspects.filter(a => !a.required && a.usage !== 'RECOMMENDED');
  return {
    categoryId,
    totalAspects: aspects.length,
    required, recommended, optional,
    all: aspects,
    fieldMapping: aspects.reduce((map, aspect) => { map[aspect.ebayName] = aspect.suredoneInlineField; return map; }, {})
  };
}
