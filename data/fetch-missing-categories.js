// fetch-missing-categories.js
// Run this to add missing categories from your audit to the database
// Usage: node fetch-missing-categories.js

const fs = require('fs');

const API_BASE = 'https://camera-spec-finder.vercel.app/api/ebay/get-category-aspects';

// Categories that were missing from the audit (scored 0)
const MISSING_CATEGORIES = {
  '67010': 'Pneumatic Cylinders',
  '67011': 'Pneumatic Valves', 
  '57011': 'Hydraulic Valves',
  '66981': 'VFDs/AC Drives',
  '181938': 'Transformers',
  '181831': 'Fuses',
  '181836': 'Fuse Holders',
  '181693': 'Timing Relays',
  '50928': 'Mist Separators/Filters',
  '181685': 'Contactors',
  '181723': 'Temperature Controllers',
  '181720': 'Power Supplies (alt)',
  '36802': 'Machine Vision Lights',
  '55826': 'Linear Actuators',
  '111607': 'Pressure Indicators'
};

async function fetchCategory(categoryId, name) {
  const url = `${API_BASE}?categoryId=${categoryId}`;
  console.log(`Fetching ${categoryId} (${name})...`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      return {
        name: name,
        aspects: {
          required: data.required || [],
          recommended: data.recommended || [],
          optional: data.optional || []
        }
      };
    } else {
      console.log(`  ❌ Error: ${data.error}`);
      return null;
    }
  } catch (err) {
    console.log(`  ❌ Failed: ${err.message}`);
    return null;
  }
}

async function main() {
  // Load existing database
  const dbPath = './ebay-category-aspects.json';
  let database;
  
  try {
    database = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (err) {
    console.error('Could not load ebay-category-aspects.json');
    console.error('Make sure you run this from the /data folder');
    process.exit(1);
  }
  
  console.log(`\nLoaded database with ${Object.keys(database.categories).length} categories\n`);
  
  let added = 0;
  let failed = 0;
  
  for (const [categoryId, name] of Object.entries(MISSING_CATEGORIES)) {
    // Skip if already in database
    if (database.categories[categoryId]?.aspects?.recommended?.length > 0) {
      console.log(`  ⏭️  ${categoryId} already in database`);
      continue;
    }
    
    const result = await fetchCategory(categoryId, name);
    
    if (result) {
      database.categories[categoryId] = result;
      const recCount = result.aspects.recommended?.length || 0;
      const optCount = result.aspects.optional?.length || 0;
      console.log(`  ✅ Added ${categoryId}: ${recCount} recommended, ${optCount} optional`);
      added++;
    } else {
      failed++;
    }
    
    // Small delay between requests
    await new Promise(r => setTimeout(r, 300));
  }
  
  // Save updated database
  fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
  
  console.log(`\n========================================`);
  console.log(`Added: ${added} categories`);
  console.log(`Failed: ${failed} categories`);
  console.log(`Total in database: ${Object.keys(database.categories).length}`);
  console.log(`\nDatabase saved to ${dbPath}`);
}

main();
