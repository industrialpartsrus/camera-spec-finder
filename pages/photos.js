// pages/photos.js
// Mobile-first Photo Station for warehouse photographers
// Guided workflow: Queue → Capture → Review → Upload → Complete

import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { Camera, Check, X, RefreshCw, Package, AlertCircle, ArrowLeft, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import { storage, db } from '../firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, doc, updateDoc, getDoc, Timestamp, addDoc } from 'firebase/firestore';
import NotificationCenter from '../components/NotificationCenter';
import PartRequestModal from '../components/PartRequestModal';
import UserPicker from '../components/UserPicker';
import app from '../firebase';
import { getCurrentUser, clearCurrentUser } from '../lib/users';

const CONDITION_OPTIONS = [
  { value: 'New', label: 'New', color: 'bg-green-100 border-green-500 text-green-900' },
  { value: 'New Other (see details)', label: 'New in Box', color: 'bg-green-100 border-green-500 text-green-900' },
  { value: 'New (Other)', label: 'New Surplus', color: 'bg-blue-100 border-blue-500 text-blue-900' },
  { value: 'Open Box (Never Used)', label: 'Open Box', color: 'bg-blue-100 border-blue-500 text-blue-900' },
  { value: 'Used', label: 'Used', color: 'bg-yellow-100 border-yellow-500 text-yellow-900' },
  { value: 'For parts or not working', label: 'For Parts', color: 'bg-red-100 border-red-500 text-red-900' }
];

const PHOTO_STEPS = [
  {
    id: 'left',
    number: 1,
    title: '📷 Left View',
    description: 'Angle item to show left side',
    required: true
  },
  {
    id: 'right',
    number: 2,
    title: '📷 Right View',
    description: 'Angle item to show right side',
    required: true
  },
  {
    id: 'center',
    number: 3,
    title: '📷 Front/Center View',
    description: 'Item facing straight on',
    required: true
  },
  {
    id: 'nameplate',
    number: 4,
    title: '🏷️ Nameplate',
    description: 'Close-up of label/nameplate',
    required: true
  },
  {
    id: 'extra',
    number: 5,
    title: '📷 Extra Photos (optional)',
    description: 'Add any additional angles',
    required: false
  }
];

export default function PhotoStation() {
  // Auth state
  const [screen, setScreen] = useState('queue'); // queue, capture, review, uploading, complete
  const [currentUser, setCurrentUser] = useState(null);

  // Queue state
  const [queueItems, setQueueItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [showPartRequest, setShowPartRequest] = useState(false);

  // Photo capture state
  const [capturedPhotos, setCapturedPhotos] = useState({
    left: null,
    right: null,
    center: null,
    nameplate: null,
    extra: []
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef(null);
  const uploadInputRef = useRef(null); // For single slot upload
  const bulkUploadInputRef = useRef(null); // For bulk upload

  // Review state
  const [removeBgFlags, setRemoveBgFlags] = useState({
    left: false,
    right: false,
    center: false,
    nameplate: false
  });
  const [processingBg, setProcessingBg] = useState({});
  const [processedPhotos, setProcessedPhotos] = useState({});
  const [photoOrder, setPhotoOrder] = useState([]);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  // Load current user on mount
  useEffect(() => {
    // Clean up old login keys
    localStorage.removeItem('photos_user');

    // Load current user from unified system
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      loadQueue();
    }
  }, []);

  // ============================================
  // USER LOGIN/LOGOUT
  // ============================================

  const handleUserSelect = (user) => {
    setCurrentUser(user);
    loadQueue();
  };

  const handleSwitchUser = () => {
    clearCurrentUser();
    setCurrentUser(null);
    resetAllState();
  };

  // ============================================
  // QUEUE SCREEN
  // ============================================

  const loadQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const response = await fetch('/api/photos/queue');
      const data = await response.json();

      if (data.success) {
        setQueueItems(data.items || []);
      } else {
        alert('Failed to load queue: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Queue load error:', error);
      alert('Failed to load queue: ' + error.message);
    }
    setIsLoadingQueue(false);
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setCurrentStep(1);
    setCapturedPhotos({
      left: null,
      right: null,
      center: null,
      nameplate: null,
      extra: []
    });
    setScreen('capture');
  };

  // ============================================
  // PHOTO CAPTURE SCREEN
  // ============================================

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageCapture = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsCapturing(true);

    try {
      // Compress and convert to base64
      const base64Data = await compressImage(file);

      // Show preview
      setPreviewPhoto({
        dataUrl: `data:image/jpeg;base64,${base64Data}`,
        file: file,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Image capture error:', error);
      alert('Failed to process image: ' + error.message);
    }

    setIsCapturing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 1200;
          const quality = 0.8;
          let { width, height } = img;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            const r = new FileReader();
            r.readAsDataURL(blob);
            r.onloadend = () => resolve(r.result.split(',')[1]);
          }, 'image/jpeg', quality);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleAcceptPhoto = () => {
    const step = PHOTO_STEPS[currentStep - 1];

    if (step.id === 'extra') {
      // Add to extra array
      setCapturedPhotos(prev => ({
        ...prev,
        extra: [...prev.extra, previewPhoto]
      }));
    } else {
      // Set specific view
      setCapturedPhotos(prev => ({
        ...prev,
        [step.id]: previewPhoto
      }));
    }

    setPreviewPhoto(null);

    // Auto-advance to next step if not on extra photos
    if (step.id !== 'extra' && currentStep < PHOTO_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleRetakePhoto = () => {
    setPreviewPhoto(null);
  };

  const handleUploadClick = () => {
    uploadInputRef.current?.click();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsCapturing(true);

    try {
      // Compress and convert to base64
      const base64Data = await compressImage(file);

      // Show preview (same as camera capture)
      setPreviewPhoto({
        dataUrl: `data:image/jpeg;base64,${base64Data}`,
        file: file,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('File upload error:', error);
      alert('Failed to process file: ' + error.message);
    }

    setIsCapturing(false);
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  };

  const handleBulkUploadClick = () => {
    bulkUploadInputRef.current?.click();
  };

  const handleBulkUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsCapturing(true);

    try {
      // Find empty slots
      const emptySlots = [];
      for (const step of PHOTO_STEPS) {
        if (step.id === 'extra') {
          // Can always add more extra photos
          continue;
        } else if (!capturedPhotos[step.id]) {
          emptySlots.push(step.id);
        }
      }

      // Process files and assign to empty slots
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64Data = await compressImage(file);

        if (i < emptySlots.length) {
          // Assign to specific slot
          const slotId = emptySlots[i];
          setCapturedPhotos(prev => ({
            ...prev,
            [slotId]: {
              dataUrl: `data:image/jpeg;base64,${base64Data}`,
              file: file,
              timestamp: new Date().toISOString()
            }
          }));
        } else {
          // Add to extra photos
          setCapturedPhotos(prev => ({
            ...prev,
            extra: [...prev.extra, {
              dataUrl: `data:image/jpeg;base64,${base64Data}`,
              file: file,
              timestamp: new Date().toISOString()
            }]
          }));
        }
      }

      alert(`✅ Uploaded ${files.length} photo${files.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Bulk upload error:', error);
      alert('Failed to upload files: ' + error.message);
    }

    setIsCapturing(false);
    if (bulkUploadInputRef.current) bulkUploadInputRef.current.value = '';
  };

  const handleBulkDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer.files || []);
    if (files.length === 0) return;

    // Filter for image files only
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      alert('No image files found');
      return;
    }

    // Use the same bulk upload handler
    handleBulkUpload({ target: { files: imageFiles } });
  };

  const handleNextStep = () => {
    if (currentStep < PHOTO_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getRequiredPhotosCount = () => {
    let count = 0;
    if (capturedPhotos.left) count++;
    if (capturedPhotos.right) count++;
    if (capturedPhotos.center) count++;
    if (capturedPhotos.nameplate) count++;
    return count;
  };

  const canProceedToReview = () => {
    return getRequiredPhotosCount() === 4;
  };

  const handleProceedToReview = () => {
    if (canProceedToReview()) {
      // Initialize photo order
      const order = [];
      if (capturedPhotos.left) order.push('left');
      if (capturedPhotos.right) order.push('right');
      if (capturedPhotos.center) order.push('center');
      if (capturedPhotos.nameplate) order.push('nameplate');
      capturedPhotos.extra.forEach((_, idx) => order.push(`extra_${idx + 1}`));
      setPhotoOrder(order);

      setScreen('review');
    }
  };

  // ============================================
  // REVIEW SCREEN
  // ============================================

  const handleRetakeFromReview = (view) => {
    // Find the step number for this view
    const stepIndex = PHOTO_STEPS.findIndex(s => s.id === view);
    if (stepIndex !== -1) {
      // Clear processed photo and background removal flag when retaking
      setProcessedPhotos(prev => {
        const updated = { ...prev };
        delete updated[view];
        return updated;
      });
      setRemoveBgFlags(prev => ({
        ...prev,
        [view]: false
      }));

      setCurrentStep(stepIndex + 1);
      setScreen('capture');
    }
  };

  const handleRemoveExtraPhoto = (index) => {
    // Remove from capturedPhotos.extra array
    setCapturedPhotos(prev => ({
      ...prev,
      extra: prev.extra.filter((_, i) => i !== index)
    }));

    // Remove from photoOrder and re-index remaining extras
    setPhotoOrder(prev => {
      const viewId = `extra_${index + 1}`;
      // Remove the deleted extra
      let newOrder = prev.filter(id => id !== viewId);

      // Re-index remaining extras that come after the deleted one
      newOrder = newOrder.map(id => {
        if (id.startsWith('extra_')) {
          const extraIndex = parseInt(id.split('_')[1]);
          if (extraIndex > index + 1) {
            return `extra_${extraIndex - 1}`;
          }
        }
        return id;
      });

      return newOrder;
    });
  };

  const handleMovePhotoLeft = (viewId) => {
    const currentIndex = photoOrder.indexOf(viewId);
    if (currentIndex > 0) {
      const newOrder = [...photoOrder];
      [newOrder[currentIndex - 1], newOrder[currentIndex]] =
        [newOrder[currentIndex], newOrder[currentIndex - 1]];
      setPhotoOrder(newOrder);
    }
  };

  const handleMovePhotoRight = (viewId) => {
    const currentIndex = photoOrder.indexOf(viewId);
    if (currentIndex < photoOrder.length - 1) {
      const newOrder = [...photoOrder];
      [newOrder[currentIndex], newOrder[currentIndex + 1]] =
        [newOrder[currentIndex + 1], newOrder[currentIndex]];
      setPhotoOrder(newOrder);
    }
  };

  const handleRemoveBg = async (view, shouldRemove) => {
    // Toggle flag
    setRemoveBgFlags(prev => ({
      ...prev,
      [view]: shouldRemove
    }));

    if (!shouldRemove) {
      // User unchecked - remove processed version
      setProcessedPhotos(prev => {
        const updated = { ...prev };
        delete updated[view];
        return updated;
      });
      return;
    }

    // Process background removal
    setProcessingBg(prev => ({ ...prev, [view]: true }));

    try {
      // Handle both standard views and extra photos
      const isExtra = view.startsWith('extra_');
      const photo = isExtra
        ? capturedPhotos.extra?.[parseInt(view.split('_')[1]) - 1]
        : capturedPhotos[view];

      if (!photo || !photo.dataUrl) {
        throw new Error('Photo not found');
      }

      // Extract base64 from data URL (remove "data:image/jpeg;base64," prefix)
      const base64 = photo.dataUrl.split(',')[1];

      const response = await fetch('/api/photos/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          view: view
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Background removal failed');
      }

      // Store processed photo
      setProcessedPhotos(prev => ({
        ...prev,
        [view]: data.dataUrl
      }));

      console.log(`Background removed for ${view}`);
    } catch (error) {
      console.error(`Background removal failed for ${view}:`, error);
      alert(`Failed to remove background for ${view}: ${error.message}`);

      // Uncheck on failure
      setRemoveBgFlags(prev => ({
        ...prev,
        [view]: false
      }));
    } finally {
      setProcessingBg(prev => ({ ...prev, [view]: false }));
    }
  };

  const handleRemoveAllBackgrounds = async () => {
    const viewsToProcess = photoOrder.filter(viewId => {
      const isExtra = viewId.startsWith('extra_');
      const photo = isExtra
        ? capturedPhotos.extra[parseInt(viewId.split('_')[1]) - 1]
        : capturedPhotos[viewId];
      return photo && !removeBgFlags[viewId];
    });

    if (viewsToProcess.length === 0) {
      alert('All backgrounds already removed!');
      return;
    }

    // Process sequentially to avoid rate limiting
    for (const viewId of viewsToProcess) {
      await handleRemoveBg(viewId, true);
    }
  };

  const handleUploadPhotos = async () => {
    setIsUploading(true);
    setUploadProgress(0);
    setScreen('uploading');

    try {
      const uploadedPhotos = [];
      const photosToUpload = [];

      // Collect photos to upload IN ORDER (photoOrder determines media1, media2, etc.)
      photoOrder.forEach((viewId, index) => {
        const isExtra = viewId.startsWith('extra_');
        const photo = isExtra
          ? capturedPhotos.extra[parseInt(viewId.split('_')[1]) - 1]
          : capturedPhotos[viewId];

        if (photo && photo.dataUrl) {
          photosToUpload.push({
            view: viewId,
            dataUrl: photo.dataUrl,
            position: index + 1 // Position 1 = main image (media1)
          });
        }
      });

      setUploadProgress(10);

      // Upload each photo directly to Firebase Storage (client-side)
      let uploadCount = 0;
      const totalUploads = photosToUpload.length + Object.keys(processedPhotos).length;
      const photosNobg = {}; // Store _nobg download URLs

      for (let i = 0; i < photosToUpload.length; i++) {
        const { view, dataUrl } = photosToUpload[i];

        try {
          // Upload original: /photos/{sku}/{view}.jpg
          const storageRef = ref(storage, `photos/${selectedItem.sku}/${view}.jpg`);

          await uploadString(storageRef, dataUrl, 'data_url', {
            contentType: 'image/jpeg',
            customMetadata: {
              sku: selectedItem.sku,
              view: view,
              uploadedBy: currentUser.username,
              uploadedAt: new Date().toISOString()
            }
          });

          const downloadURL = await getDownloadURL(storageRef);

          uploadedPhotos.push({
            view: view,
            url: downloadURL
          });

          uploadCount++;
          setUploadProgress(10 + (uploadCount / totalUploads) * 70);

          // Upload processed version if exists: /photos/{sku}/{view}_nobg.png
          if (processedPhotos[view]) {
            const nobgRef = ref(storage, `photos/${selectedItem.sku}/${view}_nobg.png`);

            await uploadString(nobgRef, processedPhotos[view], 'data_url', {
              contentType: 'image/png',
              customMetadata: {
                sku: selectedItem.sku,
                view: view,
                type: 'background_removed',
                uploadedBy: currentUser.username,
                uploadedAt: new Date().toISOString()
              }
            });

            // Get download URL for _nobg version
            const nobgDownloadURL = await getDownloadURL(nobgRef);
            photosNobg[view] = nobgDownloadURL;

            console.log(`Uploaded ${view}_nobg.png: ${nobgDownloadURL}`);

            uploadCount++;
            setUploadProgress(10 + (uploadCount / totalUploads) * 70);
          }
        } catch (uploadError) {
          console.error(`Failed to upload ${view}:`, uploadError);
          throw new Error(`Failed to upload ${view}: ${uploadError.message}`);
        }
      }

      setUploadProgress(85);

      // Update Firestore product document
      const productRef = doc(db, 'products', selectedItem.id);

      // Build update object with photo data
      const updateData = {
        photos: uploadedPhotos.map(p => p.url), // Ordered URLs (position 1 = media1)
        photosNobg: photosNobg, // Object mapping view names to _nobg URLs
        photoCount: uploadedPhotos.length,
        photoViews: uploadedPhotos.map(p => p.view), // View names in display order
        photoOrder: photoOrder, // Explicit order array for Pro Builder
        removeBgFlags: removeBgFlags,
        photographedBy: currentUser.username,
        photographedAt: Timestamp.now(),
        photosStatus: 'complete', // Track photo completion separately
        photosCompletedAt: Timestamp.now()
      };

      // Only update main status if research hasn't completed yet
      // This prevents overwriting 'complete' status from auto-research
      const currentProduct = await getDoc(productRef);
      const currentStatus = currentProduct.data()?.status;
      if (currentStatus !== 'complete' && currentStatus !== 'searching') {
        updateData.status = 'photos_complete';
      }

      await updateDoc(productRef, updateData);

      // Log to activity_log collection (optional)
      try {
        await addDoc(collection(db, 'activity_log'), {
          action: 'photos_uploaded',
          sku: selectedItem.sku,
          productId: selectedItem.id,
          photoCount: uploadedPhotos.length,
          photoViews: uploadedPhotos.map(p => p.view),
          user: currentUser.username,
          timestamp: Timestamp.now()
        });
      } catch (logError) {
        // Activity log is optional - don't fail if it doesn't exist
        console.warn('Activity log failed:', logError.message);
      }

      setUploadProgress(100);

      setSuccessMessage(`✅ Photos uploaded for ${selectedItem.sku}`);
      setScreen('complete');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
      setScreen('review');
    }

    setIsUploading(false);
  };

  // ============================================
  // COMPLETE SCREEN
  // ============================================

  const handleConfirmReturn = async () => {
    try {
      // Mark item for shelf return in Firestore
      const productRef = doc(db, 'products', selectedItem.id);
      await updateDoc(productRef, {
        returnToShelf: true,
        returnToShelfAt: Timestamp.now(),
        photoCompletedBy: currentUser.username
      });

      console.log(`${selectedItem.sku} marked for shelf return by ${currentUser.username}`);

      // Return to queue
      handleReturnToQueue();
    } catch (error) {
      console.error('Failed to mark for shelf return:', error);
      alert('Failed to mark for shelf return: ' + error.message);
    }
  };

  const handleReturnToQueue = () => {
    resetAllState();
    loadQueue();
    setScreen('queue');
  };

  // ============================================
  // HELPERS
  // ============================================

  const resetAllState = () => {
    setSelectedItem(null);
    setCurrentStep(1);
    setCapturedPhotos({
      left: null,
      right: null,
      center: null,
      nameplate: null,
      extra: []
    });
    setPreviewPhoto(null);
    setRemoveBgFlags({
      left: false,
      right: false,
      center: false,
      nameplate: false
    });
    setProcessingBg({});
    setProcessedPhotos({});
    setPhotoOrder([]);
    setUploadProgress(0);
    setSuccessMessage('');
  };

  const getConditionColor = (condition) => {
    const opt = CONDITION_OPTIONS.find(o => o.value === condition || o.label === condition);
    return opt ? opt.color : 'bg-gray-100 border-gray-500 text-gray-900';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 border-red-500 text-red-900';
      case 'high': return 'bg-orange-100 border-orange-500 text-orange-900';
      default: return 'bg-gray-100 border-gray-300 text-gray-700';
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <Head>
        <title>📷 Photos — IPRU</title>
        <link rel="icon" href="/favicon-photos.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon-photos.svg" />
      </Head>
      {/* Hidden file input for camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageCapture}
      />

      {/* Hidden file input for single slot upload */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Hidden file input for bulk upload */}
      <input
        ref={bulkUploadInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleBulkUpload}
      />

      {/* User Picker Modal - shows when no user selected */}
      {!currentUser && (
        <UserPicker
          onSelect={handleUserSelect}
          title="📷 Photo Station"
          subtitle="Select your name to begin"
        />
      )}

      {/* QUEUE SCREEN */}
      {screen === 'queue' && currentUser && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: currentUser.color }}
              />
              <div>
                <p className="text-sm text-gray-600">Logged in as</p>
                <p className="text-xl font-bold text-gray-900">{currentUser.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationCenter
                firebaseApp={app}
                userId={currentUser.id}
                deviceName={`${currentUser.name}'s Photo Station`}
              />
              <button
                onClick={handleSwitchUser}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 active:bg-gray-400 transition text-sm"
              >
                Switch User
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Photo Queue</h1>
            <button
              onClick={loadQueue}
              disabled={isLoadingQueue}
              className="p-2 bg-blue-100 text-blue-900 rounded-lg hover:bg-blue-200 active:bg-blue-300 transition disabled:opacity-50"
            >
              <RefreshCw size={24} className={isLoadingQueue ? 'animate-spin' : ''} />
            </button>
          </div>

          {isLoadingQueue ? (
            <div className="text-center py-12">
              <RefreshCw size={48} className="animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Loading queue...</p>
            </div>
          ) : queueItems.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <Package size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-xl font-bold text-gray-900 mb-2">No items need photos</p>
              <p className="text-gray-600">Check back later or scan new items</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                {queueItems.length} item{queueItems.length !== 1 ? 's' : ''} need photos
              </p>

              <div className="space-y-4">
                {queueItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className="w-full bg-white border-2 border-gray-300 rounded-xl p-4 hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 transition text-left"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-xl text-gray-900">{item.sku}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getConditionColor(item.condition)}`}>
                        {item.condition}
                      </span>
                      {item.priority !== 'normal' && (
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getPriorityColor(item.priority)}`}>
                          {item.priority.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                      {item.brand} {item.partNumber}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>📍 Shelf: {item.shelf}</span>
                      <span>👤 {item.scannedBy}</span>
                      <span>🕐 {item.timeSince}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* CAPTURE SCREEN */}
      {screen === 'capture' && selectedItem && (
        <div className="min-h-screen flex flex-col">
          {/* Item info bar (fixed at top) */}
          <div className="bg-white border-b-2 border-gray-300 p-4">
            <button
              onClick={() => setScreen('queue')}
              className="flex items-center gap-2 text-blue-600 font-semibold mb-2"
            >
              <ArrowLeft size={20} />
              Back to Queue
            </button>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-xl text-gray-900">{selectedItem.sku}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getConditionColor(selectedItem.condition)}`}>
                {selectedItem.condition}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-700">
              {selectedItem.brand} {selectedItem.partNumber}
            </p>
            <p className="text-sm text-gray-600">📍 Shelf: {selectedItem.shelf}</p>
            <button
              onClick={() => setShowPartRequest(true)}
              className="mt-2 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600"
            >
              📦 Request Part
            </button>
          </div>

          {/* Progress bar */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Progress</span>
              <span className="text-sm font-bold text-blue-600">
                {getRequiredPhotosCount()}/4 required photos
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${(getRequiredPhotosCount() / 4) * 100}%` }}
              />
            </div>
          </div>

          {/* Main capture area */}
          <div className="flex-1 p-6">
            {!previewPhoto ? (
              <div className="space-y-6">
                {/* Bulk Upload Area */}
                <div
                  className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={handleBulkDrop}
                  onClick={handleBulkUploadClick}
                >
                  <p className="text-gray-700 font-semibold mb-1">
                    📁 Drag & drop photos here, or click to browse
                  </p>
                  <p className="text-xs text-gray-500">
                    Photos will be assigned to empty slots automatically
                  </p>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {PHOTO_STEPS.map((step) => (
                    <button
                      key={step.id}
                      onClick={() => setCurrentStep(step.number)}
                      className={`flex-shrink-0 px-4 py-2 rounded-lg font-semibold text-sm transition ${
                        currentStep === step.number
                          ? 'bg-blue-600 text-white'
                          : capturedPhotos[step.id] || (step.id === 'extra' && capturedPhotos.extra.length > 0)
                          ? 'bg-green-100 text-green-900 border border-green-500'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {step.number}. {step.id === 'extra' && capturedPhotos.extra.length > 0 ? `Extra (${capturedPhotos.extra.length})` : step.id}
                    </button>
                  ))}
                </div>

                {/* Current step */}
                <div className="bg-white rounded-xl p-6">
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    {PHOTO_STEPS[currentStep - 1].title}
                  </h2>
                  <p className="text-xl text-gray-600 mb-6">
                    {PHOTO_STEPS[currentStep - 1].description}
                  </p>

                  {/* Show captured photo thumbnail if exists */}
                  {(() => {
                    const stepId = PHOTO_STEPS[currentStep - 1].id;
                    if (stepId === 'extra' && capturedPhotos.extra.length > 0) {
                      return (
                        <div className="mb-6">
                          <p className="text-sm font-semibold text-gray-700 mb-2">
                            Captured extra photos ({capturedPhotos.extra.length}):
                          </p>
                          <div className="flex gap-2 overflow-x-auto">
                            {capturedPhotos.extra.map((photo, idx) => (
                              <img
                                key={idx}
                                src={photo.dataUrl}
                                alt={`Extra ${idx + 1}`}
                                className="w-24 h-24 object-cover rounded-lg border-2 border-green-500"
                              />
                            ))}
                          </div>
                        </div>
                      );
                    } else if (capturedPhotos[stepId]) {
                      return (
                        <div className="mb-6">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Captured:</p>
                          <img
                            src={capturedPhotos[stepId].dataUrl}
                            alt={stepId}
                            className="w-32 h-32 object-cover rounded-lg border-2 border-green-500"
                          />
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Camera and Upload buttons */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={handleCameraClick}
                      disabled={isCapturing}
                      className="py-8 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2 text-xl font-bold transition disabled:opacity-50"
                    >
                      {isCapturing ? (
                        <>
                          <RefreshCw size={28} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Camera size={28} />
                          📷 Capture
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleUploadClick}
                      disabled={isCapturing}
                      className="py-8 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-xl flex items-center justify-center gap-2 text-xl font-bold transition disabled:opacity-50"
                    >
                      📁 Upload
                    </button>
                  </div>

                  {/* Navigation buttons */}
                  <div className="flex gap-3">
                    {currentStep > 1 && (
                      <button
                        onClick={handlePreviousStep}
                        className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-900 rounded-lg font-semibold transition"
                      >
                        ← Previous
                      </button>
                    )}
                    {currentStep < PHOTO_STEPS.length && (
                      <button
                        onClick={handleNextStep}
                        className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-900 rounded-lg font-semibold transition"
                      >
                        Next →
                      </button>
                    )}
                  </div>
                </div>

                {/* Proceed to review button */}
                {canProceedToReview() && (
                  <button
                    onClick={handleProceedToReview}
                    className="w-full py-6 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-xl text-2xl font-bold transition flex items-center justify-center gap-3"
                  >
                    <Check size={28} />
                    Review Photos →
                  </button>
                )}
              </div>
            ) : (
              // Preview modal
              <div className="bg-white rounded-xl p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Preview Photo</h2>
                <img
                  src={previewPhoto.dataUrl}
                  alt="Preview"
                  className="w-full rounded-lg mb-6"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleRetakePhoto}
                    className="flex-1 py-4 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-lg text-xl font-bold transition flex items-center justify-center gap-2"
                  >
                    <X size={24} />
                    Retake
                  </button>
                  <button
                    onClick={handleAcceptPhoto}
                    className="flex-1 py-4 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-lg text-xl font-bold transition flex items-center justify-center gap-2"
                  >
                    <Check size={24} />
                    Accept
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REVIEW SCREEN */}
      {screen === 'review' && selectedItem && (
        <div className="p-6">
          <button
            onClick={() => setScreen('capture')}
            className="flex items-center gap-2 text-blue-600 font-semibold mb-4"
          >
            <ArrowLeft size={20} />
            Back to Capture
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-6">Review Photos</h1>

          {/* Remove All Backgrounds Button */}
          <button
            onClick={handleRemoveAllBackgrounds}
            disabled={Object.values(processingBg).some(v => v)}
            className="w-full py-4 bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white rounded-xl text-xl font-bold transition disabled:opacity-50 mb-6 flex items-center justify-center gap-3"
          >
            {Object.values(processingBg).some(v => v) ? (
              <>
                <Loader size={24} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                ✨ Remove All Backgrounds
              </>
            )}
          </button>

          <div className="space-y-4 mb-6">
            {/* All photos in order */}
            {photoOrder.map((viewId, index) => {
              const isExtra = viewId.startsWith('extra_');
              const photo = isExtra
                ? capturedPhotos.extra[parseInt(viewId.split('_')[1]) - 1]
                : capturedPhotos[viewId];

              if (!photo) return null;

              const position = index + 1;
              const isFirst = index === 0;
              const isLast = index === photoOrder.length - 1;
              const isMain = position === 1;

              // Format view label
              const viewLabel = isExtra
                ? `Extra ${viewId.split('_')[1]}`
                : viewId.charAt(0).toUpperCase() + viewId.slice(1);

              return (
                <div key={viewId} className="bg-white rounded-xl p-4">
                  {/* Header with position badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {/* Position badge */}
                      <span className={`px-3 py-1 rounded-lg font-bold text-sm ${
                        isMain
                          ? 'bg-yellow-500 text-white'
                          : 'bg-blue-600 text-white'
                      }`}>
                        {isMain ? `★ ${position} MAIN` : position}
                      </span>
                      {/* View label */}
                      <h3 className="font-bold text-lg text-gray-900">{viewLabel} View</h3>
                    </div>
                    {/* Retake/Delete button */}
                    {isExtra ? (
                      <button
                        onClick={() => handleRemoveExtraPhoto(parseInt(viewId.split('_')[1]) - 1)}
                        className="px-4 py-2 bg-red-100 text-red-900 rounded-lg font-semibold hover:bg-red-200 active:bg-red-300 transition flex items-center gap-2"
                      >
                        <X size={18} />
                        Delete
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRetakeFromReview(viewId)}
                        className="px-4 py-2 bg-blue-100 text-blue-900 rounded-lg font-semibold hover:bg-blue-200 active:bg-blue-300 transition"
                      >
                        Retake
                      </button>
                    )}
                  </div>

                  {/* Image */}
                  <img
                    src={processedPhotos[viewId] || photo.dataUrl}
                    alt={viewId}
                    className="w-full rounded-lg mb-3"
                  />

                  {/* Reorder buttons */}
                  <div className="flex gap-3 mb-3">
                    <button
                      onClick={() => handleMovePhotoLeft(viewId)}
                      disabled={isFirst}
                      className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-900 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <ChevronLeft size={20} />
                      Move Left
                    </button>
                    <button
                      onClick={() => handleMovePhotoRight(viewId)}
                      disabled={isLast}
                      className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-900 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      Move Right
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  {/* Background removal checkbox */}
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={removeBgFlags[viewId] || false}
                      onChange={(e) => handleRemoveBg(viewId, e.target.checked)}
                      disabled={processingBg[viewId]}
                      className="w-5 h-5"
                    />
                    <span className="text-sm text-gray-700 font-semibold">
                      Remove background
                      {processingBg[viewId] && (
                        <Loader size={14} className="inline-block ml-2 animate-spin" />
                      )}
                      {removeBgFlags[viewId] && !processingBg[viewId] && (
                        <span className="ml-2 text-green-600">✓</span>
                      )}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>

          {/* Upload button */}
          <button
            onClick={handleUploadPhotos}
            disabled={isUploading}
            className="w-full py-6 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-xl text-2xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isUploading ? (
              <>
                <RefreshCw size={28} className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                📤 Upload Photos
              </>
            )}
          </button>
        </div>
      )}

      {/* UPLOADING SCREEN */}
      {screen === 'uploading' && (
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <RefreshCw size={64} className="animate-spin mx-auto mb-4 text-blue-600" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Uploading Photos...</h2>
              <p className="text-xl text-gray-600">
                {Math.round(uploadProgress)}%
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* COMPLETE SCREEN */}
      {screen === 'complete' && selectedItem && (
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="text-center w-full max-w-md">
            <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={64} className="text-white" />
            </div>
            <pre className="text-2xl font-bold text-gray-900 whitespace-pre-wrap mb-8">{successMessage}</pre>

            {/* Prominent Shelf Location Warning */}
            <div className="bg-yellow-100 border-4 border-yellow-500 rounded-xl p-8 mb-8">
              <p className="text-sm font-semibold text-yellow-900 mb-3">RETURN ITEM TO SHELF:</p>
              <p className="text-5xl font-black text-yellow-900">{selectedItem.shelf}</p>
            </div>

            <button
              onClick={handleConfirmReturn}
              className="w-full py-6 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-xl text-2xl font-bold transition flex items-center justify-center gap-3"
            >
              <Check size={28} />
              ✅ Item Returned to Shelf
            </button>
          </div>
        </div>
      )}

      {/* Part Request Modal */}
      {showPartRequest && selectedItem && (
        <PartRequestModal
          item={selectedItem}
          currentUser={currentUser}
          onClose={() => setShowPartRequest(false)}
        />
      )}
    </div>
  );
}
