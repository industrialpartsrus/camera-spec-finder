// pages/api/photos/upload-simple.js
// Simplified upload endpoint for Pro Builder
// Uploads a single photo to Firebase Storage and returns the URL
// Does NOT modify Firestore (caller handles that)

import { storage } from '../../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Increase body size limit for large 2000x2000 images
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb'
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { sku, view, imageData, contentType } = req.body;

  if (!sku || !view || !imageData) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: sku, view, imageData'
    });
  }

  try {
    // Convert base64 to buffer
    const base64Data = imageData.includes('base64,')
      ? imageData.split('base64,')[1]
      : imageData;
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload to Firebase Storage: /photos/{sku}/{view}.jpg
    const filename = `${view}.jpg`;
    const storageRef = ref(storage, `photos/${sku}/${filename}`);

    await uploadBytes(storageRef, buffer, {
      contentType: contentType || 'image/jpeg',
      customMetadata: {
        sku: sku,
        view: view,
        source: 'pro_builder_upload',
        uploadedAt: new Date().toISOString()
      }
    });

    const downloadURL = await getDownloadURL(storageRef);

    console.log(`Uploaded ${sku}/${view}: ${Math.round(buffer.length / 1024)}KB`);

    return res.status(200).json({
      success: true,
      url: downloadURL,
      view: view,
      filename: filename
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload photo',
      details: error.message
    });
  }
}
