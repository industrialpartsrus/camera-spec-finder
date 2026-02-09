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

// Categories to fetch - master list of all IDs used across the app
// Includes: master-fields.js CATEGORY_CONFIG, search-product-v2.js, get-category-specifics.js
const CATEGORIES_TO_FETCH = [
  // Already fetched (in ebay-category-aspects.json)
  '181732', // Electric Motors (General Purpose Motors)
  '124603', // Servo Motors
  '78191',  // Servo Drives & Amplifiers
  '78192',  // VFDs / AC Drives
  '181708', // PLCs (Processors/Controllers)
  '181709', // HMIs & Operator Panels
  '185134', // Circuit Breakers
  '65464',  // Safety Relays
  '181750', // Bearings (Ball & Roller)
  '184027', // Pneumatic/Hydraulic Cylinders
  '26261',  // Industrial Controls
  '57520',  // Sensors (general)
  '184148', // Valves (general)
  '260823', // Electrical/Fuses
  '36328',  // Test Equipment / Relays
  '181714', // PLC I/O Modules
  '65452',  // Gearmotors / Gearboxes
  '65459',  // Proximity Sensors (Linear Motion)
  '109614', // Light Towers/Stack Lights
  '181925', // Power Supplies
  '181682', // Industrial Timers / Contactors
  '42894',  // Variable Frequency Drives (alt)
  // Missing - need to fetch
  '183089', // Proximity & Photoelectric Sensors (master-fields.js, get-category-specifics.js)
  '183088', // Light Curtains (master-fields.js, get-category-specifics.js)
  '185006', // Pneumatic Cylinders (get-category-specifics.js)
  '185005', // Pneumatic Valves (get-category-specifics.js)
  '115598', // Hydraulic Pumps (get-category-specifics.js)
  '115596', // Hydraulic Valves (get-category-specifics.js)
  '181680', // Contactors / IEC & NEMA (master-fields.js, get-category-specifics.js)
  '42017',  // Power Supplies (get-category-specifics.js)
  '116922', // Transformers (get-category-specifics.js)
  '181681', // Motor Starters (get-category-specifics.js)
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
