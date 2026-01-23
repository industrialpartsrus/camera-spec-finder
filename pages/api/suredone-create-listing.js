// pages/api/suredone-create-listing.js
// Comprehensive SureDone integration with UPC assignment, BigCommerce fields, and brand matching

import { MASTER_FIELDS, CATEGORY_CONFIG, getEbayFieldName } from '../../data/master-fields';
import bigcommerceBrands from '../../data/bigcommerce_brands.json';
import upcPool from '../../data/upc_pool.json';

// 30-day warranty text
const WARRANTY_TEXT = `We warranty all items for 30 days from date of purchase. If you experience any issues with your item within this period, please contact us and we will work with you to resolve the problem. This warranty covers defects in functionality but does not cover damage caused by misuse, improper installation, or normal wear and tear.`;

// Track assigned UPCs in memory (in production, use database)
let assignedUPCIndex = 0;

// Find BigCommerce brand ID by brand name
function getBigCommerceBrandId(brandName) {
  if (!brandName) return null;
  
  const brandLower = brandName.toLowerCase().trim();
  
  // Direct match
  if (bigcommerceBrands[brandLower]) {
    return bigcommerceBrands[brandLower].id;
  }
  
  // Fuzzy match - check if brand contains or is contained in any key
  for (const [key, value] of Object.entries(bigcommerceBrands)) {
    if (key.includes(brandLower) || brandLower.includes(key)) {
      return value.id;
    }
  }
  
  // Try without special characters
  const brandClean = brandLower.replace(/[^a-z0-9]/g, '');
  for (const [key, value] of Object.entries(bigcommerceBrands)) {
    const keyClean = key.replace(/[^a-z0-9]/g, '');
    if (keyClean === brandClean) {
      return value.id;
    }
  }
  
  return null;
}

// Get next available UPC from pool
function getNextUPC() {
  // Find UPCs where sku is null (unassigned)
  const availableUPCs = upcPool.filter(u => !u.sku);
  
  if (availableUPCs.length === 0) {
    return { upc: null, remaining: 0, warning: 'No UPCs available! Please upload more.' };
  }
  
  // Get the next one
  const nextUPC = availableUPCs[assignedUPCIndex % availableUPCs.length];
  assignedUPCIndex++;
  
  const remaining = availableUPCs.length - 1;
  const warning = remaining < 100 ? `Low UPC count: ${remaining} remaining. Please upload more soon.` : null;
  
  return { 
    upc: nextUPC.upc, 
    remaining,
    warning 
  };
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
      console.log('SKU search error, starting from AI0001:', e.message);
    }
    
    const sku = `AI${String(aiNumber).padStart(4, '0')}`;
    
    // === GET UPC ===
    const upcResult = getNextUPC();
    
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
    formData.append('brand', product.brand);
    
    // === UPC ===
    if (upcResult.upc) {
      formData.append('upc', upcResult.upc);
    }
    
    // === MPN, MODEL, PARTNUMBER ===
    formData.append('mpn', product.partNumber);
    formData.append('model', product.model || product.partNumber);
    formData.append('partnumber', product.partNumber);
    
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
    }
    
    // === BIGCOMMERCE REQUIRED FIELDS ===
    formData.append('bigcommerceisconditionshown', 'on');
    formData.append('bigcommerceavailabilitydescription', 'In Stock');
    formData.append('bigcommercerelatedproducts', '-1');
    formData.append('bigcommercewarranty', WARRANTY_TEXT);
    formData.append('bigcommerceisvisible', 'on');
    formData.append('bigcommercechannels', '1');
    formData.append('bigcommercepagetitle', product.title);
    formData.append('bigcommercempn', product.partNumber);
    
    // BigCommerce bin location = shelf
    if (product.shelfLocation) {
      formData.append('bigcommercebinpickingnumber', product.shelfLocation);
    }
    
    // === BIGCOMMERCE BRAND ID ===
    const bigcommerceBrandId = getBigCommerceBrandId(product.brand);
    if (bigcommerceBrandId) {
      formData.append('bigcommercebrandid', bigcommerceBrandId);
      console.log(`Brand match: "${product.brand}" → ID ${bigcommerceBrandId}`);
    } else {
      console.log(`No brand match found for: "${product.brand}"`);
    }
    
    // === META / SEO FIELDS ===
    if (product.shortDescription) {
      formData.append('bigcommercemetadescription', product.shortDescription);
    }
    
    // Keywords - populate BOTH fields
    if (product.metaKeywords) {
      const keywords = Array.isArray(product.metaKeywords) ? product.metaKeywords.join(', ') : product.metaKeywords;
      formData.append('bigcommercesearchkeywords', keywords);
      formData.append('bigcommercemetakeywords', keywords);
    }
    
    // === CATEGORIES ===
    const productCategory = product.productCategory || 'Unknown';
    const categoryConfig = CATEGORY_CONFIG[productCategory];
    
    if (categoryConfig) {
      if (categoryConfig.ebayCategoryId) {
        formData.append('ebaycatid', categoryConfig.ebayCategoryId);
      }
      if (categoryConfig.ebayStoreCategoryId) {
        formData.append('ebaystoreid', categoryConfig.ebayStoreCategoryId);
      }
      if (categoryConfig.bigcommerceCategoryId) {
        formData.append('bigcommercecategories', categoryConfig.bigcommerceCategoryId.toString());
      }
    }
    
    // Override with explicit values if provided
    if (product.ebayCategoryId) formData.append('ebaycatid', product.ebayCategoryId);
    if (product.ebayStoreCategoryId) formData.append('ebaystoreid', product.ebayStoreCategoryId);
    if (product.ebayStoreCategoryId2) formData.append('ebaystoreid2', product.ebayStoreCategoryId2);
    if (product.bigcommerceCategoryId) formData.append('bigcommercecategories', product.bigcommerceCategoryId);
    
    // === EBAY SHIPPING PROFILE ===
    formData.append('ebayshippingprofileid', product.ebayShippingProfileId || '69077991015');
    
    // === EBAY RETURN POLICY (not for "For Parts") ===
    if (!isForParts) {
      formData.append('ebayreturnprofileid', product.ebayReturnProfileId || '61860297015');
    }
    
    // === MAP SPECIFICATIONS TO EBAY ITEM SPECIFICS ===
    if (product.specifications && typeof product.specifications === 'object') {
      console.log('=== MAPPING SPECIFICATIONS ===');
      console.log('Product Category:', productCategory);
      
      for (const [masterField, value] of Object.entries(product.specifications)) {
        if (!value || value === 'null') continue;
        
        // Get the eBay field name for this category
        const ebayFieldName = getEbayFieldName(masterField, productCategory);
        
        if (ebayFieldName) {
          console.log(`Mapping: ${masterField} = "${value}" → ${ebayFieldName}`);
          formData.append(ebayFieldName, value);
        }
        
        // Also store in generic SureDone fields
        const genericFieldMappings = {
          'voltage': 'voltage',
          'amperage': 'amperage',
          'horsepower': 'horsepower',
          'rpm': 'rpm',
          'frame_size': 'frame',
          'phase': 'phase',
          'frequency': 'hz',
          'coil_voltage': 'coilvoltage',
          'max_pressure': 'maxpressure',
          'bore_diameter': 'borediameter',
          'stroke_length': 'strokelength',
          'port_size': 'portsize',
          'sensing_range': 'sensingrange',
          'kw_rating': 'kw',
          'input_voltage': 'inputvoltage',
          'output_voltage': 'outputvoltage',
          'number_of_poles': 'numberofpoles',
          'mounting_type': 'mountingtype',
          'enclosure': 'enclosuretype',
          'ip_rating': 'iprating',
          'service_factor': 'servicefactor',
          'nema_design': 'nemadesignletter',
          'insulation_class': 'insulationclass',
          'motor_type': 'motortype'
        };
        
        if (genericFieldMappings[masterField]) {
          formData.append(genericFieldMappings[masterField], value);
        }
      }
    }
    
    // === RAW SPECIFICATIONS AS CUSTOM FIELDS ===
    if (product.rawSpecifications && Array.isArray(product.rawSpecifications)) {
      product.rawSpecifications.forEach((spec, index) => {
        if (index < 20) {
          formData.append(`customfield${index + 1}`, spec);
        }
      });
    }
    
    console.log('=== FINAL FORM DATA ===');
    console.log('All fields:', Object.fromEntries(formData.entries()));
    
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
      console.error('Failed to parse SureDone response:', responseText.substring(0, 500));
      return res.status(500).json({ 
        success: false,
        error: 'Invalid response from SureDone',
        details: responseText.substring(0, 500)
      });
    }

    if (data.result === 'success') {
      const responseObj = { 
        success: true, 
        message: 'Product created in SureDone',
        sku: data.sku || sku,
        upc: upcResult.upc,
        upcRemaining: upcResult.remaining,
        bigcommerceBrandId: bigcommerceBrandId
      };
      
      // Add warning if UPC is low
      if (upcResult.warning) {
        responseObj.warning = upcResult.warning;
      }
      
      res.status(200).json(responseObj);
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
      error: error.message,
      stack: error.stack 
    });
  }
}
