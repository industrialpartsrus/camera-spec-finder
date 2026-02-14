// pages/api/generate-sku.js
// Server-side API endpoint for SKU generation
// Uses atomic Firestore counter (simple, fast, reliable)

import { generateNextSku } from '../../lib/sku-generator';

/**
 * API handler - Generate next available AI#### SKU using Firestore counter
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    const nextSku = await generateNextSku();

    return res.status(200).json({
      success: true,
      sku: nextSku
    });
  } catch (error) {
    console.error('Error generating SKU:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate SKU',
      details: error.message
    });
  }
}
