// API route for matching brand names to BigCommerce brand IDs
import brands from '../../data/bigcommerce_brands.json';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brandName } = req.body;

  if (!brandName) {
    return res.status(400).json({ error: 'Brand name required' });
  }

  try {
    const searchTerm = brandName.toLowerCase().trim();

    // Try exact match first
    let match = brands[searchTerm];

    if (!match) {
      // Try partial match
      const allBrands = Object.entries(brands);
      const partialMatch = allBrands.find(([key, value]) => 
        key.includes(searchTerm) || searchTerm.includes(key)
      );

      if (partialMatch) {
        match = partialMatch[1];
      }
    }

    if (!match) {
      // No match found - will need to create new brand
      return res.status(200).json({
        success: true,
        match: null,
        needsCreation: true,
        brandName: brandName
      });
    }

    res.status(200).json({
      success: true,
      match: {
        name: match.name,
        id: match.id
      },
      needsCreation: false
    });

  } catch (error) {
    console.error('Brand matching error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
