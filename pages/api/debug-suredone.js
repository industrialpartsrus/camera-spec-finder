export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { product } = req.body;

  // Return the exact data that would be sent to SureDone
  const formData = {
    sku: 'AI0001', // Example SKU
    title: product.title,
    longdescription: product.description,
    price: product.price || '0.00',
    stock: product.stock || '1',
    condition: product.condition || 'Used',
    brand: product.brand,
    mpn: product.partNumber,
    ...(product.conditionNotes && { notes: product.conditionNotes }),
    ...(product.boxLength && { boxlength: product.boxLength }),
    ...(product.boxWidth && { boxwidth: product.boxWidth }),
    ...(product.boxHeight && { boxheight: product.boxHeight }),
    ...(product.weight && { weight: product.weight }),
    ...(product.shelfLocation && { customfield_shelf: product.shelfLocation }),
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
    message: 'This is what would be sent to SureDone',
    formDataObject: formData,
    formDataString: new URLSearchParams(formData).toString(),
    fieldCount: Object.keys(formData).length
  });
}
