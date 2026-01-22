// pages/api/suredone-create-listing.js
// Updated to properly map master fields to eBay item specifics and SureDone fields

import { MASTER_FIELDS, CATEGORY_CONFIG, mapToEbayFields, getEbayFieldName } from '../../data/master-fields';

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
    // Generate SKU
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
    formData.append('mpn', product.partNumber);
    
    // === CONDITION ===
    let suredoneCondition = 'Used';
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
    if (product.shelfLocation) formData.append('shelf', product.shelfLocation);
    
    // === META ===
    if (product.metaDescription || product.shortDescription) {
      formData.append('bigcommercemetadescription', product.metaDescription || product.shortDescription);
    }
    if (product.metaKeywords) {
      formData.append('bigcommercesearchkeywords', 
        Array.isArray(product.metaKeywords) ? product.metaKeywords.join(', ') : product.metaKeywords
      );
    }
    
    // === CATEGORIES ===
    // Get category config
    const productCategory = product.productCategory || 'Unknown';
    const categoryConfig = CATEGORY_CONFIG[productCategory];
    
    if (categoryConfig) {
      // eBay category ID
      if (categoryConfig.ebayCategoryId) {
        formData.append('ebaycatid', categoryConfig.ebayCategoryId);
      }
      // eBay store categories
      if (categoryConfig.ebayStoreCategoryId) {
        formData.append('ebaystoreid', categoryConfig.ebayStoreCategoryId);
      }
      // BigCommerce category
      if (categoryConfig.bigcommerceCategoryId) {
        formData.append('bigcommercecategories', categoryConfig.bigcommerceCategoryId.toString());
      }
    }
    
    // Override with explicit values if provided
    if (product.ebayCategoryId) formData.append('ebaycatid', product.ebayCategoryId);
    if (product.ebayStoreCategoryId) formData.append('ebaystoreid', product.ebayStoreCategoryId);
    if (product.ebayStoreCategoryId2) formData.append('ebaystoreid2', product.ebayStoreCategoryId2);
    if (product.bigcommerceCategoryId) formData.append('bigcommercecategories', product.bigcommerceCategoryId);
    
    // === EBAY SHIPPING/RETURN PROFILES ===
    // Default profiles - can be overridden
    formData.append('ebayshippingprofileid', product.ebayShippingProfileId || '69077991015'); // Small Package Shipping
    formData.append('ebayreturnprofileid', product.ebayReturnProfileId || '61860297015');
    
    // === MAP MASTER SPECIFICATIONS TO EBAY ITEM SPECIFICS ===
    if (product.specifications && typeof product.specifications === 'object') {
      console.log('=== MAPPING SPECIFICATIONS ===');
      console.log('Product Category:', productCategory);
      console.log('Raw specifications:', product.specifications);
      
      for (const [masterField, value] of Object.entries(product.specifications)) {
        if (!value || value === 'null') continue;
        
        // Get the eBay field name for this master field in this category
        const ebayFieldName = getEbayFieldName(masterField, productCategory);
        
        if (ebayFieldName) {
          console.log(`Mapping: ${masterField} = "${value}" → ${ebayFieldName}`);
          formData.append(ebayFieldName, value);
        } else {
          console.log(`No eBay mapping for: ${masterField} in category ${productCategory}`);
        }
        
        // Also store in generic SureDone fields for BigCommerce/other channels
        // These use the simple field names from SureDone headers
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
          'ip_rating': 'iprating'
        };
        
        if (genericFieldMappings[masterField]) {
          formData.append(genericFieldMappings[masterField], value);
        }
      }
    }
    
    // === ALSO MAP RAW SPECIFICATIONS AS BACKUP ===
    // This ensures we don't lose any data if the structured mapping misses something
    if (product.rawSpecifications && Array.isArray(product.rawSpecifications)) {
      product.rawSpecifications.forEach((spec, index) => {
        if (index < 20) { // SureDone supports customfield1-20
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
      res.status(200).json({ 
        success: true, 
        message: 'Product created in SureDone',
        sku: data.sku || sku,
        mappedFields: Object.fromEntries(formData.entries())
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
      error: error.message,
      stack: error.stack 
    });
  }
}
