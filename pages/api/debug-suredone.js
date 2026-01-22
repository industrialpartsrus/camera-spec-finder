export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { product } = req.body;

  // Map condition to SureDone's allowed values
  let suredoneCondition = 'Used';
  if (product.condition) {
    const conditionLower = product.condition.toLowerCase();
    if (conditionLower.includes('new in box') || conditionLower.includes('nib')) {
      suredoneCondition = 'New';
    } else if (conditionLower.includes('new') && (conditionLower.includes('open') || conditionLower.includes('box'))) {
      suredoneCondition = 'New Other';
    } else if (conditionLower.includes('refurbished')) {
      suredoneCondition = 'Manufacturer Refurbished';
    } else if (conditionLower.includes('parts') || conditionLower.includes('not working')) {
      suredoneCondition = 'For Parts or Not Working';
    }
  }

  // Return the exact data that would be sent to SureDone
  const formData = {
    sku: 'AI0001', // Example SKU
    title: product.title,
    longdescription: product.description,
    price: product.price || '0.00',
    stock: product.stock || '1',
    condition: suredoneCondition, // ✅ Fixed - now uses valid condition value
    brand: product.brand,
    mpn: product.partNumber,
    ...(product.conditionNotes && { notes: product.conditionNotes }),
    ...(product.boxLength && { boxlength: product.boxLength }),
    ...(product.boxWidth && { boxwidth: product.boxWidth }),
    ...(product.boxHeight && { boxheight: product.boxHeight }),
    ...(product.weight && { weight: product.weight }),
    ...(product.shelfLocation && { shelf: product.shelfLocation }), // ✅ Fixed - removed customfield_ prefix
    ...(product.metaDescription && { metadescription: product.metaDescription }),
    ...(product.metaKeywords && { keywords: product.metaKeywords }),
    ...(product.ebayCategory && { ebaycategory: product.ebayCategory })
  };

  // Add specifications as custom fields
  if (product.specifications && product.specifications.length > 0) {
    product.specifications.forEach((spec, index) => {
      formData[`customfield${index + 1}`] = spec;
    });
  }

  // Return formatted for easy reading
  return res.status(200).json({
    message: 'This is what would be sent to SureDone (FIXED VERSION)',
    fixes: [
      '✅ Condition mapped to: ' + suredoneCondition,
      '✅ Shelf uses "shelf" not "customfield_shelf"'
    ],
    formDataObject: formData,
    formDataString: new URLSearchParams(formData).toString(),
    fieldCount: Object.keys(formData).length
  });
}
