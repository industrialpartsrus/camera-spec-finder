// pages/api/suredone/update-item.js
// Updates a single item in SureDone

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const updateData = req.body;

  if (!updateData.guid) {
    return res.status(400).json({ error: 'guid (SKU) is required' });
  }

  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  try {
    // SureDone uses PUT to /items to update
    const url = `${SUREDONE_URL}/editor/items`;
    
    console.log('Updating SureDone item:', updateData.guid);
    console.log('Update payload:', JSON.stringify(updateData));

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    const responseText = await response.text();
    console.log('SureDone response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { raw: responseText };
    }

    if (response.ok && (data.result === 'success' || data.result === 1 || data['1'])) {
      return res.status(200).json({
        success: true,
        message: 'Item updated successfully',
        guid: updateData.guid,
        response: data
      });
    } else {
      return res.status(200).json({
        success: false,
        error: data.message || data.error || 'Update may have failed',
        guid: updateData.guid,
        response: data
      });
    }

  } catch (error) {
    console.error('SureDone update error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update item',
      details: error.message
    });
  }
}
