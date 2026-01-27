/**
 * eBay Category Aspects Fetcher
 * Run this script to populate the category aspects database
 * 
 * Usage: node fetch-category-aspects.js [categoryId]
 * 
 * Examples:
 *   node fetch-category-aspects.js 184027
 *   node fetch-category-aspects.js all
 */

const https = require('https');
const fs = require('fs');

const API_BASE = 'https://camera-spec-finder.vercel.app/api/ebay/get-category-aspects';
const DB_FILE = './ebay-category-aspects.json';

// Categories to fetch (your top 25)
const CATEGORIES_TO_FETCH = [
  '184027', '26261', '57520', '184148', '181732', '260823', '185134',
  '78191', '36328', '181714', '65452', '65459', '181709', '124603',
  '65464', '181750', '109614', '181925', '78192', '181682', '42894'
];

function fetchCategory(categoryId) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}?categoryId=${categoryId}`;
    console.log(`Fetching: ${url}`);
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Parse error for ${categoryId}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

function simplifyAspects(apiResponse) {
  if (!apiResponse.success) return null;
  
  return {
    required: (apiResponse.required || []).map(a => ({
      name: a.name,
      mode: a.aspectMode,
      allowedValues: (a.allowedValues || []).slice(0, 50), // Limit to 50 for size
      acceptsCustom: a.aspectMode === 'FREE_TEXT'
    })),
    recommended: (apiResponse.recommended || []).map(a => ({
      name: a.name,
      mode: a.aspectMode,
      allowedValues: (a.allowedValues || []).slice(0, 50),
      acceptsCustom: a.aspectMode === 'FREE_TEXT'
    })),
    optional: (apiResponse.optional || []).map(a => ({
      name: a.name,
      mode: a.aspectMode,
      allowedValues: (a.allowedValues || []).slice(0, 30),
      acceptsCustom: a.aspectMode === 'FREE_TEXT'
    }))
  };
}

async function updateDatabase(categoryId) {
  // Load existing database
  let db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  
  const response = await fetchCategory(categoryId);
  
  if (response.success) {
    const simplified = simplifyAspects(response);
    
    if (db.categories[categoryId]) {
      db.categories[categoryId].aspects = simplified;
      db.categories[categoryId]._lastFetched = new Date().toISOString();
      delete db.categories[categoryId]._fetchUrl;
    } else {
      db.categories[categoryId] = {
        name: `Category ${categoryId}`,
        aspects: simplified,
        _lastFetched: new Date().toISOString()
      };
    }
    
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    console.log(`✅ Updated category ${categoryId}`);
    console.log(`   Required: ${simplified.required.length}, Recommended: ${simplified.recommended.length}, Optional: ${simplified.optional.length}`);
  } else {
    console.error(`❌ Failed to fetch ${categoryId}:`, response.error);
  }
}

async function fetchAll() {
  for (const catId of CATEGORIES_TO_FETCH) {
    try {
      await updateDatabase(catId);
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`Error fetching ${catId}:`, err.message);
    }
  }
  console.log('\n✅ Done fetching all categories!');
}

// Main
const arg = process.argv[2];

if (!arg) {
  console.log('Usage: node fetch-category-aspects.js [categoryId|all]');
  console.log('\nCategories available to fetch:');
  CATEGORIES_TO_FETCH.forEach(c => console.log(`  ${c}`));
} else if (arg === 'all') {
  fetchAll();
} else {
  updateDatabase(arg).catch(console.error);
}
