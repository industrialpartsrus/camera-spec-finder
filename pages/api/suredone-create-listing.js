// pages/api/suredone-create-listing.js
// Complete SureDone integration - standalone with all features

// 30-day warranty text
const WARRANTY_TEXT = `We warranty all items for 30 days from date of purchase. If you experience any issues with your item within this period, please contact us and we will work with you to resolve the problem. This warranty covers defects in functionality but does not cover damage caused by misuse, improper installation, or normal wear and tear.`;

// Capitalize first letter of each word
function capitalizeWords(str) {
  if (!str) return str;
  return str.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

// Uppercase for MPN/Model
function toUpperCase(str) {
  if (!str) return str;
  return str.toUpperCase();
}

// Smart brand capitalization
function capitalizeBrand(brandName) {
  if (!brandName) return brandName;
  
  // Special brand abbreviations (always all caps)
  const allCaps = ['ABB', 'SMC', 'CKD', 'IAI', 'PHD', 'STI', 'TDK', 'NSK', 'SKF', 'IKO', 
    'THK', 'NTN', 'FAG', 'GE', 'SEW', 'WEG', 'ATO', 'ARO', 'ITT', 'MKS', 'MTS', 'NSD',
    'IFM', 'HTM', 'NKE', 'ACU', 'AEG', 'AMK', 'APC', 'BBC', 'EAO', 'EMD', 'GEA'];
  
  const brandLower = brandName.toLowerCase().trim();
  const brandUpper = brandName.toUpperCase().trim();
  
  // Check if it's an all-caps brand
  if (allCaps.includes(brandUpper)) {
    return brandUpper;
  }
  
  // Handle hyphenated brands
  if (brandLower.includes('-')) {
    return brandLower.split('-').map(part => {
      if (allCaps.includes(part.toUpperCase())) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    }).join('-');
  }
  
  // Handle + in brand names (like Bihl+Wiedemann)
  if (brandLower.includes('+')) {
    return brandLower.split('+').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join('+');
  }
  
  // Default: capitalize each word
  return capitalizeWords(brandName);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { product } = req.body;

  if (!product) {
    return res.status(400).json({ error: 'No product data provided' });
  }

  if (!product.title || !product.brand || !product.partNumber) {
    return res.status(400).json({ error: 'Missing required fields: title, brand, or partNumber' });
  }

  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  try {
    // === GENERATE SKU ===
    let aiNumber = 1;
    try {
      const searchResponse = await fetch(`${SUREDONE_URL}/editor/items?search=sku:AI`, {
        method: 'GET',
        headers: {
          'X-Auth-User': SUREDONE_USER,
          'X-Auth-Token': SUREDONE_TOKEN
        }
      });
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const skus = [];
        for (const key in searchData) {
          if (key !== 'result' && key !== 'message' && key !== 'type' && key !== 'time') {
            const item = searchData[key];
            if (item && item.sku && item.sku.startsWith('AI')) {
              const match = item.sku.match(/^AI(\d+)/);
              if (match) skus.push(parseInt(match[1], 10));
            }
          }
        }
        if (skus.length > 0) {
          aiNumber = Math.max(...skus) + 1;
        }
      }
    } catch (e) {
      console.log('SKU search error:', e.message);
    }
    
    const sku = `AI${String(aiNumber).padStart(4, '0')}`;
    
    // === FORMAT FIELDS ===
    const brandFormatted = capitalizeBrand(product.brand);
    const mpnFormatted = toUpperCase(product.partNumber);
    const modelFormatted = toUpperCase(product.model || product.partNumber);
    
    console.log('=== FIELD FORMATTING ===');
    console.log('Brand:', product.brand, '→', brandFormatted);
    console.log('MPN:', product.partNumber, '→', mpnFormatted);
    console.log('Model:', product.model || product.partNumber, '→', modelFormatted);
    
    // Build form data
    const formData = new URLSearchParams();
    
    // === CORE FIELDS ===
    formData.append('identifier', 'guid');
    formData.append('guid', sku);
    formData.append('sku', sku);
    formData.append('title', product.title);
    formData.append('longdescription', product.description || '');
    formData.append('price', product.price || '0.00');
    formData.append('stock', product.stock || '1');
    
    // Brand and Manufacturer (both same, capitalized)
    formData.append('brand', brandFormatted);
    formData.append('manufacturer', brandFormatted);
    
    // MPN, Model, PartNumber (uppercase)
    formData.append('mpn', mpnFormatted);
    formData.append('model', modelFormatted);
    formData.append('partnumber', mpnFormatted);
    
    // === CONDITION ===
    let suredoneCondition = 'Used';
    let isForParts = false;
    if (product.condition) {
      const condLower = product.condition.toLowerCase();
      if (condLower.includes('new in box') || condLower.includes('nib')) {
        suredoneCondition = 'New';
      } else if (condLower.includes('new') && condLower.includes('open')) {
        suredoneCondition = 'New Other';
      } else if (condLower.includes('refurbished')) {
        suredoneCondition = 'Manufacturer Refurbished';
      } else if (condLower.includes('parts') || condLower.includes('not working')) {
        suredoneCondition = 'For Parts or Not Working';
        isForParts = true;
      }
    }
    formData.append('condition', suredoneCondition);
    
    if (product.conditionNotes) {
      formData.append('notes', product.conditionNotes);
    }
    
    // === DIMENSIONS ===
    if (product.boxLength) formData.append('boxlength', product.boxLength);
    if (product.boxWidth) formData.append('boxwidth', product.boxWidth);
    if (product.boxHeight) formData.append('boxheight', product.boxHeight);
    if (product.weight) formData.append('weight', product.weight);
    
    // === SHELF LOCATION ===
    if (product.shelfLocation) {
      formData.append('shelf', product.shelfLocation);
      formData.append('bigcommercebinpickingnumber', product.shelfLocation);
    }
    
    // === BIGCOMMERCE REQUIRED FIELDS ===
    formData.append('bigcommerceisconditionshown', 'on');
    formData.append('bigcommerceavailabilitydescription', 'In Stock');
    formData.append('bigcommercerelatedproducts', '-1');
    formData.append('bigcommercewarranty', WARRANTY_TEXT);
    formData.append('bigcommerceisvisible', 'on');
    formData.append('bigcommercechannels', '1');
    formData.append('bigcommercepagetitle', product.title);
    formData.append('bigcommercempn', mpnFormatted);
    
    // === META / SEO FIELDS ===
    // Short description for meta - ensure it's populated
    const metaDescription = product.shortDescription || 
      product.metaDescription || 
      (product.description ? product.description.replace(/<[^>]*>/g, ' ').substring(0, 157) + '...' : '');
    
    if (metaDescription) {
      formData.append('bigcommercemetadescription', metaDescription);
      console.log('Meta description:', metaDescription.substring(0, 100));
    }
    
    // Keywords - populate BOTH fields
    if (product.metaKeywords) {
      const keywords = Array.isArray(product.metaKeywords) ? product.metaKeywords.join(', ') : product.metaKeywords;
      formData.append('bigcommercesearchkeywords', keywords);
      formData.append('bigcommercemetakeywords', keywords);
    }
    
    // === EBAY CATEGORY (main eBay marketplace category) ===
    if (product.ebayCategoryId) {
      formData.append('ebaycatid', product.ebayCategoryId);
      console.log('eBay Category ID:', product.ebayCategoryId);
    }
    
    // === EBAY STORE CATEGORIES ===
    if (product.ebayStoreCategoryId) {
      formData.append('ebaystoreid', product.ebayStoreCategoryId);
      console.log('eBay Store Category 1:', product.ebayStoreCategoryId);
    }
    if (product.ebayStoreCategoryId2) {
      formData.append('ebaystoreid2', product.ebayStoreCategoryId2);
      console.log('eBay Store Category 2:', product.ebayStoreCategoryId2);
    }
    
    // BigCommerce category
    if (product.bigcommerceCategoryId) {
      formData.append('bigcommercecategories', product.bigcommerceCategoryId);
    }
    
    // === EBAY SHIPPING PROFILE ===
    formData.append('ebayshippingprofileid', product.ebayShippingProfileId || '69077991015');
    
    // === EBAY RETURN POLICY (not for "For Parts") ===
    if (!isForParts) {
      formData.append('ebayreturnprofileid', product.ebayReturnProfileId || '61860297015');
    }
    
    // === MAP SPECIFICATIONS TO EBAY ITEM SPECIFICS ===
    // Only add specs that have actual values
    if (product.specifications && typeof product.specifications === 'object') {
      console.log('=== MAPPING SPECIFICATIONS ===');
      
      const ebaySpecMappings = {
        'voltage': 'ebayitemspecificsvoltage',
        'amperage': 'ebayitemspecificscurrent',
        'horsepower': 'ebayitemspecificsratedhorsepower',
        'kw_rating': 'ebayitemspecificspoweroutput',
        'rpm': 'ebayitemspecificsspeed',
        'frame_size': 'ebayitemspecificsframesize',
        'phase': 'ebayitemspecificsacphase',
        'frequency': 'ebayitemspecificsfrequency',
        'enclosure': 'ebayitemspecificsenclosure',
        'ip_rating': 'ebayitemspecificsiprating',
        'communication_protocol': 'ebayitemspecificsconnectivity',
        'input_voltage': 'ebayitemspecificsinputvoltage',
        'output_voltage': 'ebayitemspecificsoutputvoltage',
        'sensing_range': 'ebayitemspecificssensingdistance',
        'bore_diameter': 'ebayitemspecificsboresize',
        'stroke_length': 'ebayitemspecificsstroke',
        'max_pressure': 'ebayitemspecificsmaxpressure',
        'mounting_type': 'ebayitemspecificsmountingtype'
      };
      
      for (const [key, value] of Object.entries(product.specifications)) {
        if (value && value !== 'null' && value !== null && value !== 'N/A' && value !== 'Unknown') {
          const ebayField = ebaySpecMappings[key];
          if (ebayField) {
            formData.append(ebayField, value);
            console.log(`Spec: ${key} = "${value}" → ${ebayField}`);
          }
        }
      }
    }
    
    // === RAW SPECS AS CUSTOM FIELDS ===
    // Only add if they are actual spec strings, not numbers
    if (product.rawSpecifications && Array.isArray(product.rawSpecifications)) {
      let customFieldIndex = 1;
      for (const spec of product.rawSpecifications) {
        // Skip if it's just a number or empty
        if (spec && typeof spec === 'string' && spec.includes(':') && customFieldIndex <= 20) {
          formData.append(`customfield${customFieldIndex}`, spec);
          customFieldIndex++;
        }
      }
      console.log('Added', customFieldIndex - 1, 'custom fields');
    }
    
    console.log('=== FINAL FORM DATA ===');
    const formDataObj = Object.fromEntries(formData.entries());
    console.log('Key fields:', {
      sku,
      brand: brandFormatted,
      mpn: mpnFormatted,
      ebaycatid: formDataObj.ebaycatid,
      ebaystoreid: formDataObj.ebaystoreid,
      bigcommercemetadescription: formDataObj.bigcommercemetadescription?.substring(0, 50)
    });
    
    // === SEND TO SUREDONE ===
    const response = await fetch(`${SUREDONE_URL}/editor/items/add`, {
      method: 'POST',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const responseText = await response.text();
    console.log('SureDone response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return res.status(500).json({ 
        success: false,
        error: 'Invalid response from SureDone',
        details: responseText.substring(0, 500)
      });
    }

    if (data.result === 'success') {
      res.status(200).json({ 
        success: true, 
        message: 'Product created in SureDone',
        sku: data.sku || sku,
        brandFormatted,
        mpnFormatted
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: data.message || 'SureDone API error',
        details: data
      });
    }
    
  } catch (error) {
    console.error('SureDone integration error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
}
