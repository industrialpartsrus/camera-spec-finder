// pages/api/photos/upload.js
// Upload photos to Firebase Storage and update product record
// Accepts base64-encoded photos and uploads to /photos/{sku}/

import { db, storage } from '../../../firebase';
import { doc, updateDoc, Timestamp, collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { sku, productId, photos, photographedBy, removeBgFlags } = req.body;

  // Validation
  if (!sku || !productId || !photos || !Array.isArray(photos) || photos.length === 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['sku', 'productId', 'photos (array)', 'photographedBy']
    });
  }

  if (!photographedBy) {
    return res.status(400).json({ error: 'photographedBy is required' });
  }

  try {
    const uploadedPhotos = [];
    const failedPhotos = [];

    // Upload each photo to Firebase Storage
    for (const photo of photos) {
      const { view, data } = photo;

      if (!view || !data) {
        failedPhotos.push({ view, error: 'Missing view or data' });
        continue;
      }

      try {
        // Convert base64 to buffer
        const base64Data = data.includes('base64,') ? data.split('base64,')[1] : data;
        const buffer = Buffer.from(base64Data, 'base64');

        // Create storage reference: /photos/{sku}/{view}.jpg
        const filename = `${view}.jpg`;
        const storageRef = ref(storage, `photos/${sku}/${filename}`);

        // Upload with metadata
        const metadata = {
          contentType: 'image/jpeg',
          customMetadata: {
            sku: sku,
            view: view,
            uploadedBy: photographedBy,
            uploadedAt: new Date().toISOString()
          }
        };

        await uploadBytes(storageRef, buffer, metadata);

        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);

        uploadedPhotos.push({
          view: view,
          url: downloadURL,
          filename: filename
        });
      } catch (uploadError) {
        console.error(`Failed to upload ${view}:`, uploadError);
        failedPhotos.push({ view, error: uploadError.message });
      }
    }

    // If no photos uploaded successfully, return error
    if (uploadedPhotos.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'All photo uploads failed',
        failedPhotos: failedPhotos
      });
    }

    // Update Firestore product document
    try {
      const productRef = doc(db, 'products', productId);

      const updateData = {
        photos: uploadedPhotos.map(p => p.url),
        photoCount: uploadedPhotos.length,
        photoViews: uploadedPhotos.map(p => p.view),
        photographedBy: photographedBy,
        photographedAt: Timestamp.now(),
        status: 'photos_complete'
      };

      await updateDoc(productRef, updateData);

      // Log to activity_log collection (if it exists)
      try {
        const activityLogRef = collection(db, 'activity_log');
        await addDoc(activityLogRef, {
          action: 'photos_uploaded',
          sku: sku,
          productId: productId,
          photoCount: uploadedPhotos.length,
          photoViews: uploadedPhotos.map(p => p.view),
          user: photographedBy,
          timestamp: Timestamp.now()
        });
      } catch (logError) {
        // Activity log is optional - don't fail if it doesn't exist
        console.warn('Activity log failed (collection may not exist):', logError.message);
      }

      return res.status(200).json({
        success: true,
        sku: sku,
        photoCount: uploadedPhotos.length,
        photos: uploadedPhotos,
        failedPhotos: failedPhotos.length > 0 ? failedPhotos : undefined
      });
    } catch (firestoreError) {
      // Photos uploaded but Firestore update failed
      console.error('Firestore update failed:', firestoreError);
      return res.status(500).json({
        success: false,
        error: 'Photos uploaded but failed to update product record',
        details: firestoreError.message,
        uploadedPhotos: uploadedPhotos,
        message: 'Photos are in storage but not linked to product. Manual fix needed.'
      });
    }
  } catch (error) {
    console.error('Photo upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload photos',
      details: error.message
    });
  }
}
