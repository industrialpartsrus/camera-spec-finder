// pages/api/scanner/diagnose.js
// Diagnostic endpoint to debug SureDone lookup issues
// Tests all search strategies and shows what data is actually stored

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { sku, partNumber, brand } = req.body;

  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  const diagnostic = {
    testedSku: sku,
    testedPartNumber: partNumber,
    testedBrand: brand,
    timestamp: new Date().toISOString(),
    directLookup: null,
    searchStrategies: []
  };

  try {
    // STEP 1: Direct lookup by SKU/GUID
    if (sku) {
      console.log(`\n=== DIRECT LOOKUP: ${sku} ===`);
      const directUrl = `https://api.suredone.com/v1/editor/items?q=guid:=${sku}`;
      const directRes = await fetch(directUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Auth-User': SUREDONE_USER,
          'X-Auth-Token': SUREDONE_TOKEN
        }
      });

      if (directRes.ok) {
        const directData = await directRes.json();
        const item = directData[0] || null;

        if (item) {
          diagnostic.directLookup = {
            found: true,
            sku: item.sku || item.guid,
            guid: item.guid,
            title: item.title,
            brand: item.brand,
            mpn: item.mpn,
            model: item.model,
            partnumber: item.partnumber,
            stock: item.stock,
            shelf: item.shelf,
            rawFieldsCount: Object.keys(item).length
          };

          console.log('FOUND:', {
            mpn: item.mpn,
            model: item.model,
            partnumber: item.partnumber,
            title: item.title
          });
        } else {
          diagnostic.directLookup = { found: false, error: 'No item returned' };
          console.log('NOT FOUND');
        }
      } else {
        diagnostic.directLookup = { found: false, error: `HTTP ${directRes.status}` };
        console.log(`ERROR: ${directRes.status}`);
      }
    }

    // STEP 2: Test all search strategies
    if (partNumber) {
      const strategies = [
        { name: 'Exact MPN', query: `mpn:=${partNumber}` },
        { name: 'MPN Contains', query: `mpn:${partNumber}` },
        { name: 'Exact Model', query: `model:=${partNumber}` },
        { name: 'Model Contains', query: `model:${partNumber}` },
        { name: 'Exact Partnumber', query: `partnumber:=${partNumber}` },
        { name: 'Partnumber Contains', query: `partnumber:${partNumber}` },
        { name: 'Title Contains', query: `title:${partNumber}` },
        { name: 'Keyword Search', query: partNumber },
        { name: 'Uppercase MPN', query: `mpn:=${partNumber.toUpperCase()}` },
        { name: 'Lowercase MPN', query: `mpn:=${partNumber.toLowerCase()}` }
      ];

      // Add hyphen variations if part number contains hyphens
      if (partNumber.includes('-')) {
        const noHyphens = partNumber.replace(/-/g, '');
        const withSpaces = partNumber.replace(/-/g, ' ');
        strategies.push(
          { name: 'No Hyphens MPN', query: `mpn:=${noHyphens}` },
          { name: 'No Hyphens Model', query: `model:=${noHyphens}` },
          { name: 'Spaces MPN', query: `mpn:=${withSpaces}` },
          { name: 'Spaces Model', query: `model:=${withSpaces}` },
          { name: 'No Hyphens Contains MPN', query: `mpn:${noHyphens}` },
          { name: 'No Hyphens Contains Model', query: `model:${noHyphens}` }
        );
      }

      // Add brand + part number combos if brand provided
      if (brand) {
        strategies.push(
          { name: 'Brand + MPN Exact', query: `brand:=${brand} mpn:=${partNumber}` },
          { name: 'Brand + MPN Contains', query: `brand:=${brand} mpn:${partNumber}` },
          { name: 'Brand Contains + MPN', query: `brand:${brand} mpn:=${partNumber}` }
        );
      }

      for (const strategy of strategies) {
        console.log(`\n=== TESTING: ${strategy.name} ===`);
        console.log(`Query: ${strategy.query}`);

        const searchUrl = `https://api.suredone.com/v1/search/items/${encodeURIComponent(strategy.query)}`;
        const searchRes = await fetch(searchUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Auth-User': SUREDONE_USER,
            'X-Auth-Token': SUREDONE_TOKEN
          }
        });

        const result = {
          name: strategy.name,
          query: strategy.query,
          url: searchUrl,
          found: false,
          resultCount: 0,
          results: []
        };

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const products = [];

          for (const key in searchData) {
            if (!isNaN(key) && searchData[key] && typeof searchData[key] === 'object') {
              products.push({
                sku: searchData[key].sku || searchData[key].guid,
                guid: searchData[key].guid,
                brand: searchData[key].brand,
                mpn: searchData[key].mpn,
                model: searchData[key].model,
                partnumber: searchData[key].partnumber,
                title: searchData[key].title
              });
            }
          }

          result.found = products.length > 0;
          result.resultCount = products.length;
          result.results = products;

          console.log(`Results: ${products.length}`);
          if (products.length > 0) {
            console.log('First result:', products[0]);
          }
        } else {
          result.error = `HTTP ${searchRes.status}`;
          console.log(`ERROR: ${searchRes.status}`);
        }

        diagnostic.searchStrategies.push(result);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return res.status(200).json(diagnostic);
  } catch (error) {
    console.error('Diagnostic error:', error);
    return res.status(500).json({
      error: 'Diagnostic failed',
      details: error.message,
      diagnostic
    });
  }
}
