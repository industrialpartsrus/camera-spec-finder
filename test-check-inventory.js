// test-check-inventory.js
// Run this locally to test the check-inventory API endpoint
// Usage: node test-check-inventory.js

const testCases = [
  { brand: 'SMC', partNumber: 'CDQ2A40-100D' },
  { brand: 'Baldor', partNumber: 'M3211T' },
  { brand: 'Allen Bradley', partNumber: '1756-L72' },
  { brand: '', partNumber: 'VFD007C43A' },  // Test without brand
];

async function testAPI(baseUrl = 'http://localhost:3000') {
  console.log('='.repeat(60));
  console.log('Testing Check Inventory API');
  console.log('='.repeat(60));
  console.log('');

  for (const testCase of testCases) {
    console.log(`\nTesting: Brand="${testCase.brand || '(none)'}", Part="${testCase.partNumber}"`);
    console.log('-'.repeat(50));

    try {
      const response = await fetch(`${baseUrl}/api/check-inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testCase)
      });

      const data = await response.json();

      if (data.found) {
        console.log(`✅ FOUND ${data.totalMatches} match(es)!`);
        data.matches.forEach((match, index) => {
          console.log(`\n  Match #${index + 1}:`);
          console.log(`    SKU: ${match.sku}`);
          console.log(`    Title: ${match.title}`);
          console.log(`    Condition: ${match.condition}`);
          console.log(`    Shelf: ${match.shelf}`);
          console.log(`    Stock: ${match.stock}`);
          console.log(`    Price: $${match.price}`);
          console.log(`    Images: ${match.imageCount}`);
          console.log(`    Thumbnail: ${match.thumbnail || 'None'}`);
          console.log(`    eBay: ${match.channels.ebay ? 'Yes' : 'No'}`);
          console.log(`    BigCommerce: ${match.channels.bigcommerce ? 'Yes' : 'No'}`);
          if (match.missingFields.length > 0) {
            console.log(`    ⚠️  Missing: ${match.missingFields.join(', ')}`);
          }
        });
      } else {
        console.log(`❌ No matches found in inventory with stock > 0`);
      }

    } catch (error) {
      console.log(`🔴 ERROR: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Testing complete');
  console.log('='.repeat(60));
}

// Check if running with a custom URL
const customUrl = process.argv[2];
if (customUrl) {
  console.log(`Using custom URL: ${customUrl}`);
  testAPI(customUrl);
} else {
  console.log('Using default URL: http://localhost:3000');
  console.log('(Pass a URL as argument to test against a different server)');
  console.log('Example: node test-check-inventory.js https://camera-spec-finder.vercel.app');
  console.log('');
  testAPI();
}
