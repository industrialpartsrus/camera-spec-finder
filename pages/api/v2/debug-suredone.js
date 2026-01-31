// pages/api/v2/debug-suredone.js
// DEBUG API - Shows exactly what would be sent to SureDone WITHOUT actually sending it
// Use this to troubleshoot field mapping issues

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { listing } = req.body;

  if (!listing) {
    return res.status(400).json({ error: 'Listing data is required' });
  }

  console.log('=== DEBUG SUREDONE PAYLOAD ===');
  console.log('Full listing received:', JSON.stringify(listing, null, 2));

  // Build the exact same payload we would send to SureDone
  const formData = {};

  // Core fields
  formData['sku'] = 'DEBUG-TEST';
  formData['title'] = listing.title;
  formData['longdescription'] = listing.description?.substring(0, 200) + '...'; // Truncated for display
  formData['price'] = listing.price || '0.00';
  formData['stock'] = listing.quantity || '1';
  
  // Brand & MPN
  formData['brand'] = listing.brand;
  formData['manufacturer'] = listing.manufacturer || listing.brand;
  formData['mpn'] = listing.partNumber;
  formData['model'] = listing.model || listing.partNumber;
  formData['partnumber'] = listing.partNumber;
  
  // Product Type
  formData['usertype'] = listing.productType;
  
  // Condition
  formData['condition'] = listing.condition?.suredoneValue;
  formData['notes'] = listing.condition?.descriptionNote;

  // Categories
  formData['ebaycatid'] = listing.ebayCategoryId;
  formData['ebaystoreid'] = listing.ebayStoreCategoryId;
  formData['ebaystoreid2'] = listing.ebayStoreCategoryId2;
  
  // BigCommerce Categories
  formData['bigcommercecategories'] = listing.bigcommerceCategories;

  // Country of Origin
  formData['countryoforigin'] = listing.countryOfOrigin;
  formData['countryregionofmanufacture'] = listing.countryOfOrigin;

  // Item Specifics - This is what we need to debug!
  const itemSpecificsDebug = {};
  if (listing.itemSpecifics && typeof listing.itemSpecifics === 'object') {
    for (const [fieldName, value] of Object.entries(listing.itemSpecifics)) {
      if (value && value !== null && value !== '' && value !== 'null' && value !== 'undefined') {
        formData[fieldName] = value;
        itemSpecificsDebug[fieldName] = value;
      }
    }
  }

  // Log everything
  console.log('=== ITEM SPECIFICS BEING SENT ===');
  console.log(JSON.stringify(itemSpecificsDebug, null, 2));
  
  console.log('=== FULL FORM DATA ===');
  console.log(JSON.stringify(formData, null, 2));

  // Return detailed debug info
  res.status(200).json({
    success: true,
    debug: true,
    message: 'This is a DEBUG response - nothing was sent to SureDone',
    
    // What we received
    receivedListing: {
      brand: listing.brand,
      partNumber: listing.partNumber,
      productType: listing.productType,
      condition: listing.condition,
      ebayCategoryId: listing.ebayCategoryId,
      ebayStoreCategoryId: listing.ebayStoreCategoryId,
      bigcommerceCategories: listing.bigcommerceCategories
    },
    
    // Item specifics analysis
    itemSpecificsAnalysis: {
      totalFieldsReceived: Object.keys(listing.itemSpecifics || {}).length,
      fieldsWithValues: Object.entries(listing.itemSpecifics || {})
        .filter(([k, v]) => v && v !== '' && v !== null)
        .length,
      fieldList: Object.entries(listing.itemSpecifics || {}).map(([key, value]) => ({
        fieldName: key,
        value: value,
        willBeSent: value && value !== '' && value !== null
      }))
    },
    
    // The actual form data that would be sent
    formDataWouldSend: formData,
    
    // Helpful field name reference
    fieldNameReference: {
      'Motors - Common Fields': {
        'Brand': 'brand',
        'MPN': 'mpn',
        'Rated Load (HP)': 'ratedloadhp',
        'Base RPM': 'baserpm',
        'Nominal Rated Input Voltage': 'nominalratedinputvoltage',
        'AC Phase': 'acphase',
        'Service Factor': 'servicefactor',
        'NEMA Frame Suffix': 'nemaframesuffix',
        'Enclosure Type': 'enclosuretype',
        'AC Motor Type': 'acmotortype',
        'Current Type': 'currenttype',
        'Shaft Diameter': 'shaftdiameter',
        'Model': 'model'
      },
      'Note': 'SureDone expects lowercase field names with no spaces or special characters'
    }
  });
}
