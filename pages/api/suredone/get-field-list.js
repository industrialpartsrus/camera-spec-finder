// pages/api/suredone/get-field-list.js
// =============================================================================
// ONE-TIME DIAGNOSTIC: Pull the complete field inventory from SureDone
// =============================================================================
// Fetches all registered field names from SureDone settings + a known item.
// Returns structured data showing:
//   - All multi-channel short names (inline fields)
//   - All ebayitemspecifics-prefixed fields (eBay-only)
//   - The mapping between them
//
// Usage: GET /api/suredone/get-field-list
// =============================================================================

// Platform prefixes to exclude from "short name" attribute fields
const PLATFORM_PREFIXES = [
  'amzn', 'amazon', 'magento', 'magentoold', 'magentotwo',
  'skuvault', 'google', 'etsy', 'walmart', 'ebay', 'bigcommerce', 'media'
];

// Known system/meta fields (not item specifics attributes)
const SYSTEM_FIELDS = new Set([
  'sku', 'guid', 'stock', 'price', 'discountprice', 'msrp', 'cost',
  'featured', 'name', 'title', 'keywords', 'description', 'longdescription',
  'shortdescription', 'condition', 'notes', 'weight', 'boxlength', 'boxwidth',
  'boxheight', 'boxweight', 'boxshape', 'brand', 'manufacturer', 'mpn', 'model',
  'upc', 'gtin', 'usertype', 'uri', 'galleryuri', 'parenturi',
  'date', 'datesold', 'dateupdated', 'dateupdatedutc', 'dateutc',
  'shelf', 'thumbnail', 'totalsold', 'dnr', 'dnp', 'identifier',
  'totalquantitysold', 'watchers', 'fitments', 'stash', 'groups',
  'variants', 'variantattribute', 'variantattribute2', 'variantattribute3',
  'variations', 'bundlelisting', 'content', 'domain', 'asset',
  'id', 'active', 'state', 'status', 'rule', 'type',
  'dimweight', 'handlingfee', 'shipping', 'shippingadditional', 'shippingoption',
  'overridecost', 'overrideoption', 'overridetype', 'iskit',
  'internationalshipping1', 'internationalshippinglocation1',
  'fulfillmentlatency', 'geolocation', 'total_stock', 'url', 'htmltitle',
  'useraction', 'userupc', 'metadescription', 'tags', 'flash', 'dram',
  'numberinpack', 'modifieditem', 'shield', 'partnumber',
  'updatenotes', 'updatereason', 'cup', 'frn', 'newsfromdate',
  'searchterm1', 'searchterm2', 'searchterm3', 'searchterm4', 'searchterm5',
  'bulletpoint1', 'bulletpoint2', 'bulletpoint3', 'bulletpoint4', 'bulletpoint5',
  'category1', 'category2', 'category3', 'category4', 'category5',
  'applicableregions', 'materialssourcedfrom',
  'msrpdisplayactualpricetyp', 'msrpenabled', 'plugtype',
]);

// Non-English field names (international translations that exist in SureDone)
const NON_ENGLISH_FIELDS = new Set([
  'actueltype', 'adaptmdia', 'altre', 'amperaggio', 'amperstrke', 'amprage',
  'ausgangsleistung', 'basedetrmin', 'basegirialminuto', 'bobine', 'bohrlochdurchmesser',
  'cadre', 'cariconominalehp', 'chargenominalehp', 'chevauxpuissance',
  'classediisolamento', 'compatiblemodelo', 'completchargeamp', 'completocaricoampere',
  'correntetipo', 'corrientetipo', 'couplongueur', 'cylindreaction', 'cylindretype',
  'diamtre', 'effettivovototensioneiningresso', 'eingangsspannung',
  'enceintetype', 'fabricant', 'fabricante', 'forma', 'girialminuto',
  'herstellungslandundregion', 'hersteller', 'herstellernummer',
  'impulsipergiro', 'leistungspannung', 'marca', 'marcaequipaggiamento',
  'marke', 'marque', 'massimoamperaggio', 'massimompa', 'maximalepression',
  'maximalestromstrke', 'maxoprationpression', 'minuteobjtaille',
  'modell', 'modello', 'modelloanno', 'modelo', 'modelocompatibleibilitt', 'modle',
  'mximoamperaje', 'nemadesignlettre', 'nmeroderecambio', 'nominalevototensioneiningresso',
  'numrodepice', 'numrodepicefabricant', 'numeropezzo',
  'otro', 'paesedifabbricazione', 'pasregindefabricacin', 'passendmedia',
  'paysdefabrication', 'paysrgiondefabrication', 'pignon',
  'potenzadiuscita', 'potenzanominale', 'pressionemassima',
  'produttore', 'produktart', 'rapportodiriduzione', 'reaktionszeit',
  'regal', 'repisa', 'ripiano', 'sensorart', 'serie', 'sortietype',
  'sourcedalimentation', 'spannung', 'streichlnge', 'tagre',
  'teilenummer', 'tempsderponse', 'tensione', 'tensionenominale',
  'tipo', 'tipodebombilla', 'tipodiattrezzocompatibile', 'typ',
  'typeactuel', 'typedecapteur', 'typedecourant',
  'vatios', 'voltaggiobobina', 'voltaje', 'zylinderaktion',
  'analogicodigitale',
]);

function isPlatformField(key) {
  for (const prefix of PLATFORM_PREFIXES) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const BASE_URL = 'https://api.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  const headers = {
    'Content-Type': 'application/json',
    'x-auth-user': SUREDONE_USER,
    'x-auth-token': SUREDONE_TOKEN
  };

  const results = {};

  try {
    // =========================================================================
    // 1. Fetch a known well-populated item by exact SKU
    //    SureDone returns ALL registered fields (even empty ones) per item,
    //    so this gives us the complete field inventory.
    // =========================================================================
    console.log('=== Fetching known item AI0125 for field discovery ===');

    let allItemKeys = [];
    let sampleItem = null;

    try {
      const searchUrl = `${BASE_URL}/search/items/${encodeURIComponent('guid:=AI0125')}`;
      const searchResponse = await fetch(searchUrl, { method: 'GET', headers });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();

        // Find the item (skip metadata keys like result, message, type, time)
        for (const key of Object.keys(searchData)) {
          const val = searchData[key];
          if (typeof val === 'object' && val !== null && val.guid) {
            sampleItem = val;
            break;
          }
        }

        if (sampleItem) {
          allItemKeys = Object.keys(sampleItem);
          console.log(`Found item ${sampleItem.guid} with ${allItemKeys.length} total keys`);
        }
      } else {
        results.itemSearchError = `HTTP ${searchResponse.status}`;
      }
    } catch (e) {
      results.itemSearchError = e.message;
    }

    // Fallback: try editor/items search if exact search failed
    if (!sampleItem) {
      console.log('Exact search failed, trying editor/items...');
      try {
        const fallbackResponse = await fetch(`${BASE_URL}/editor/items?search=sku:AI`, {
          method: 'GET', headers
        });
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          for (const key of Object.keys(fallbackData)) {
            if (key === 'result' || key === 'message' || key === 'type' || key === 'time') continue;
            const val = fallbackData[key];
            if (typeof val === 'object' && val !== null && val.guid) {
              sampleItem = val;
              allItemKeys = Object.keys(val);
              console.log(`Fallback found item ${val.guid} with ${allItemKeys.length} keys`);
              break;
            }
          }
        }
      } catch (e) {
        results.itemFallbackError = e.message;
      }
    }

    // =========================================================================
    // 2. Try settings endpoints for eBay specifics field list
    // =========================================================================
    console.log('=== Trying SureDone settings endpoints ===');

    // Try /v1/settings/ebay_specifics_fields
    let settingsEbaySpecifics = null;
    const settingsEndpoints = [
      'ebay_specifics_fields',
      'ebay_attribute_mapping',
      'all'
    ];

    for (const endpoint of settingsEndpoints) {
      try {
        const settingsUrl = `${BASE_URL}/settings/${endpoint}`;
        console.log(`Trying: ${settingsUrl}`);
        const settingsResponse = await fetch(settingsUrl, { method: 'GET', headers });
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          const keys = Object.keys(settingsData);

          // Check if it's an error response
          if (settingsData.result === 'failure') {
            results[`settings_${endpoint}`] = { error: settingsData.errors || 'failed' };
            continue;
          }

          // If we got actual data, check what's inside
          results[`settings_${endpoint}`] = {
            topKeys: keys.slice(0, 30),
            totalKeys: keys.length
          };

          // If this is ebay_specifics_fields and contains a pipe-delimited string
          if (endpoint === 'ebay_specifics_fields') {
            if (typeof settingsData === 'string') {
              settingsEbaySpecifics = settingsData.split('|').filter(Boolean);
              results.settingsEbaySpecificsList = settingsEbaySpecifics;
            } else if (settingsData.fields && typeof settingsData.fields === 'string') {
              settingsEbaySpecifics = settingsData.fields.split('|').filter(Boolean);
              results.settingsEbaySpecificsList = settingsEbaySpecifics;
            }
          }

          // Check for site_defaults in any settings response
          if (settingsData.site_defaults && typeof settingsData.site_defaults === 'object') {
            const defaultKeys = Object.keys(settingsData.site_defaults);
            results.siteDefaultsFound = {
              source: endpoint,
              totalFields: defaultKeys.length,
              sampleKeys: defaultKeys.slice(0, 20)
            };
          }
        }
      } catch (e) {
        results[`settings_${endpoint}_error`] = e.message;
      }
    }

    // =========================================================================
    // 3. Categorize ALL fields from the item
    // =========================================================================
    if (!sampleItem) {
      return res.status(200).json({
        success: false,
        error: 'Could not find any items in SureDone to extract fields from',
        ...results
      });
    }

    console.log('=== Categorizing fields ===');

    const shortNameFields = [];      // Multi-channel attribute fields
    const ebayItemSpecifics = [];    // ebayitemspecifics* fields
    const ebay2ItemSpecifics = [];   // ebay2itemspecifics* fields
    const systemFields = [];
    const platformFields = [];
    const nonEnglishFields = [];
    let internationalEbayExcluded = 0;

    for (const key of allItemKeys.sort()) {
      // eBay item specifics (prefixed)
      if (key.startsWith('ebayitemspecifics')) {
        const aspectName = key.substring('ebayitemspecifics'.length);
        // Filter non-English: only allow a-z (all ebayitemspecifics keys are lowercase)
        if (/[^a-z]/.test(aspectName)) {
          internationalEbayExcluded++;
          continue;
        }
        ebayItemSpecifics.push({
          fullKey: key,
          aspectName: aspectName,
          hasValue: !!(sampleItem[key] && sampleItem[key] !== '')
        });
        continue;
      }

      // eBay2 item specifics
      if (key.startsWith('ebay2itemspecifics')) {
        ebay2ItemSpecifics.push(key);
        continue;
      }

      // Platform fields (ebay*, bigcommerce*, amzn*, magento*, etc.)
      if (isPlatformField(key)) {
        platformFields.push(key);
        continue;
      }

      // System/meta fields
      if (SYSTEM_FIELDS.has(key)) {
        systemFields.push(key);
        continue;
      }

      // Non-English attribute fields
      if (NON_ENGLISH_FIELDS.has(key)) {
        nonEnglishFields.push(key);
        continue;
      }

      // Everything else is a potential multi-channel attribute short name
      shortNameFields.push({
        key: key,
        hasValue: !!(sampleItem[key] && sampleItem[key] !== '')
      });
    }

    // =========================================================================
    // 4. Build cross-reference: which short names have ebayitemspecifics twins?
    // =========================================================================
    const shortNameSet = new Set(shortNameFields.map(f => f.key));
    const ebayAspectSet = new Set(ebayItemSpecifics.map(f => f.aspectName));

    const shortToPrefix = {};  // short name → corresponding ebayitemspecifics key
    const ebayOnlyFields = []; // ebayitemspecifics fields with NO short name twin

    for (const field of ebayItemSpecifics) {
      if (shortNameSet.has(field.aspectName)) {
        shortToPrefix[field.aspectName] = field.fullKey;
      } else {
        ebayOnlyFields.push(field);
      }
    }

    // =========================================================================
    // 5. Build final output
    // =========================================================================
    console.log('=== FIELD INVENTORY COMPLETE ===');
    console.log(`Item: ${sampleItem.guid} (${allItemKeys.length} total keys)`);
    console.log(`Multi-channel short names: ${shortNameFields.length}`);
    console.log(`eBay item specifics (English): ${ebayItemSpecifics.length}`);
    console.log(`eBay item specifics (intl excluded): ${internationalEbayExcluded}`);
    console.log(`eBay-only (no short name): ${ebayOnlyFields.length}`);
    console.log(`Short→Prefix mappings: ${Object.keys(shortToPrefix).length}`);
    console.log(`Non-English short names excluded: ${nonEnglishFields.length}`);

    res.status(200).json({
      success: true,
      source: {
        item: sampleItem.guid,
        totalItemKeys: allItemKeys.length
      },
      summary: {
        multiChannelShortNames: shortNameFields.length,
        ebayItemSpecificsEnglish: ebayItemSpecifics.length,
        ebayItemSpecificsInternationalExcluded: internationalEbayExcluded,
        ebay2ItemSpecifics: ebay2ItemSpecifics.length,
        ebayOnlyNoShortName: ebayOnlyFields.length,
        shortToEbayMappings: Object.keys(shortToPrefix).length,
        systemFields: systemFields.length,
        platformFields: platformFields.length,
        nonEnglishShortNames: nonEnglishFields.length,
      },
      shortNameFields: shortNameFields.sort((a, b) => a.key.localeCompare(b.key)),
      ebayItemSpecifics: ebayItemSpecifics.sort((a, b) => a.aspectName.localeCompare(b.aspectName)),
      ebayOnlyFields: ebayOnlyFields.sort((a, b) => a.aspectName.localeCompare(b.aspectName)),
      shortToPrefix,
      nonEnglishExcluded: nonEnglishFields.sort(),
      ...results
    });

  } catch (error) {
    console.error('Field list error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
