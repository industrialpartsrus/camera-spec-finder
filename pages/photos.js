// pages/photos.js
// Mobile-first Photo Station for warehouse photographers
// Guided workflow: Queue → Capture → Review → Upload → Complete

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Check, X, LogOut, RefreshCw, Package, AlertCircle, ArrowLeft } from 'lucide-react';
import { verifyUser, getActiveUsers } from '../lib/auth';
import { storage, db } from '../firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, doc, updateDoc, Timestamp, addDoc } from 'firebase/firestore';

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
  const [screen, setScreen] = useState('login'); // login, queue, capture, review, uploading, complete
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [pinInput, setPinInput] = useState('');

  // Queue state
  const [queueItems, setQueueItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

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

  // Review state
  const [removeBgFlags, setRemoveBgFlags] = useState({
    left: false,
    right: false,
    center: false,
    nameplate: false
  });

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  // Load users on mount
  useEffect(() => {
    loadUsers();
    checkStoredLogin();
  }, []);

  const loadUsers = async () => {
    const activeUsers = await getActiveUsers();
    setUsers(activeUsers);
  };

  const checkStoredLogin = async () => {
    const storedUsername = localStorage.getItem('photos_user');
    if (storedUsername) {
      const activeUsers = await getActiveUsers();
      const user = activeUsers.find(u => u.username === storedUsername);
      if (user) {
        setCurrentUser(user);
        loadQueue();
        setScreen('queue');
      } else {
        // User no longer active, clear storage
        localStorage.removeItem('photos_user');
      }
    }
  };

  // ============================================
  // LOGIN SCREEN
  // ============================================

  const handleUserSelect = (userId) => {
    setSelectedUserId(userId);
    setPinInput('');
  };

  const handlePinDigit = (digit) => {
    const newPin = pinInput + digit;
    setPinInput(newPin);

    // Auto-submit when 4 digits entered
    if (newPin.length === 4) {
      handlePinSubmit(newPin);
    }
  };

  const handlePinBackspace = () => {
    setPinInput(pinInput.slice(0, -1));
  };

  const handlePinSubmit = async (pin) => {
    const selectedUser = users.find(u => u.id === selectedUserId);
    if (!selectedUser) return;

    const result = await verifyUser(selectedUser.username, pin);

    if (result.success) {
      setCurrentUser(result.user);
      setPinInput('');
      setSelectedUserId(null);
      loadQueue();
      setScreen('queue');
      // Save to localStorage for persistent login
      localStorage.setItem('photos_user', result.user.username);
    } else {
      alert(result.error || 'Incorrect PIN');
      setPinInput('');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setScreen('login');
    resetAllState();
    // Clear stored login
    localStorage.removeItem('photos_user');
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
      setCurrentStep(stepIndex + 1);
      setScreen('capture');
    }
  };

  const handleRemoveExtraPhoto = (index) => {
    setCapturedPhotos(prev => ({
      ...prev,
      extra: prev.extra.filter((_, i) => i !== index)
    }));
  };

  const handleUploadPhotos = async () => {
    setIsUploading(true);
    setUploadProgress(0);
    setScreen('uploading');

    try {
      const uploadedPhotos = [];
      const photosToUpload = [];

      // Collect photos to upload
      if (capturedPhotos.left) {
        photosToUpload.push({ view: 'left', dataUrl: capturedPhotos.left.dataUrl });
      }
      if (capturedPhotos.right) {
        photosToUpload.push({ view: 'right', dataUrl: capturedPhotos.right.dataUrl });
      }
      if (capturedPhotos.center) {
        photosToUpload.push({ view: 'center', dataUrl: capturedPhotos.center.dataUrl });
      }
      if (capturedPhotos.nameplate) {
        photosToUpload.push({ view: 'nameplate', dataUrl: capturedPhotos.nameplate.dataUrl });
      }
      capturedPhotos.extra.forEach((photo, index) => {
        photosToUpload.push({ view: `extra_${index + 1}`, dataUrl: photo.dataUrl });
      });

      setUploadProgress(10);

      // Upload each photo directly to Firebase Storage (client-side)
      for (let i = 0; i < photosToUpload.length; i++) {
        const { view, dataUrl } = photosToUpload[i];

        try {
          // Create storage reference: /photos/{sku}/{view}.jpg
          const storageRef = ref(storage, `photos/${selectedItem.sku}/${view}.jpg`);

          // Upload using data_url format (handles "data:image/jpeg;base64,..." prefix)
          await uploadString(storageRef, dataUrl, 'data_url', {
            contentType: 'image/jpeg',
            customMetadata: {
              sku: selectedItem.sku,
              view: view,
              uploadedBy: currentUser.username,
              uploadedAt: new Date().toISOString()
            }
          });

          // Get download URL
          const downloadURL = await getDownloadURL(storageRef);

          uploadedPhotos.push({
            view: view,
            url: downloadURL
          });

          // Update progress
          setUploadProgress(10 + ((i + 1) / photosToUpload.length) * 70);
        } catch (uploadError) {
          console.error(`Failed to upload ${view}:`, uploadError);
          throw new Error(`Failed to upload ${view}: ${uploadError.message}`);
        }
      }

      setUploadProgress(85);

      // Update Firestore product document
      const productRef = doc(db, 'products', selectedItem.id);
      await updateDoc(productRef, {
        photos: uploadedPhotos.map(p => p.url),
        photoCount: uploadedPhotos.length,
        photoViews: uploadedPhotos.map(p => p.view),
        photographedBy: currentUser.username,
        photographedAt: Timestamp.now(),
        status: 'photos_complete'
      });

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
    // Optional: Log the return confirmation
    handleReturnToQueue();
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
      {/* Hidden file input for camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageCapture}
      />

      {/* LOGIN SCREEN */}
      {screen === 'login' && (
        <div className="p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">📷 Photo Station</h1>
            <p className="text-gray-600">Select your name to begin</p>
          </div>

          {selectedUserId === null ? (
            <div className="space-y-4">
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user.id)}
                  className="w-full p-6 bg-white border-2 border-gray-300 rounded-xl text-xl font-semibold text-gray-900 hover:bg-blue-50 hover:border-blue-500 active:bg-blue-100 transition"
                >
                  {user.username}
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6">
              <h2 className="text-2xl font-bold text-center mb-6">Enter PIN</h2>
              <div className="flex justify-center mb-6">
                <div className="flex gap-3">
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`w-16 h-16 rounded-lg border-4 flex items-center justify-center text-3xl font-bold ${
                        pinInput.length > i ? 'border-blue-500 bg-blue-100 text-blue-900' : 'border-gray-300 bg-gray-50 text-gray-400'
                      }`}
                    >
                      {pinInput.length > i ? '●' : ''}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                  <button
                    key={digit}
                    onClick={() => handlePinDigit(digit.toString())}
                    className="h-20 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg text-3xl font-bold text-gray-900 transition"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  onClick={handlePinBackspace}
                  className="h-20 bg-red-200 hover:bg-red-300 active:bg-red-400 rounded-lg text-xl font-bold text-red-900 transition"
                >
                  ← Del
                </button>
                <button
                  onClick={() => handlePinDigit('0')}
                  className="h-20 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg text-3xl font-bold text-gray-900 transition"
                >
                  0
                </button>
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="h-20 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg text-lg font-bold text-gray-900 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* QUEUE SCREEN */}
      {screen === 'queue' && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-600">Logged in as</p>
              <p className="text-xl font-bold text-gray-900">{currentUser?.username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-900 rounded-lg font-semibold hover:bg-red-200 active:bg-red-300 transition"
            >
              <LogOut size={20} />
              Log Out
            </button>
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

                  {/* Camera button */}
                  <button
                    onClick={handleCameraClick}
                    disabled={isCapturing}
                    className="w-full py-8 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-4 text-2xl font-bold transition disabled:opacity-50 mb-4"
                  >
                    {isCapturing ? (
                      <>
                        <RefreshCw size={32} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Camera size={32} />
                        📷 Take Photo
                      </>
                    )}
                  </button>

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

          <div className="space-y-4 mb-6">
            {/* Required photos */}
            {['left', 'right', 'center', 'nameplate'].map((view) => (
              capturedPhotos[view] && (
                <div key={view} className="bg-white rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg text-gray-900 capitalize">{view} View</h3>
                    <button
                      onClick={() => handleRetakeFromReview(view)}
                      className="px-4 py-2 bg-blue-100 text-blue-900 rounded-lg font-semibold hover:bg-blue-200 active:bg-blue-300 transition"
                    >
                      Retake
                    </button>
                  </div>
                  <img
                    src={capturedPhotos[view].dataUrl}
                    alt={view}
                    className="w-full rounded-lg mb-3"
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={removeBgFlags[view] || false}
                      onChange={(e) => setRemoveBgFlags(prev => ({
                        ...prev,
                        [view]: e.target.checked
                      }))}
                      className="w-5 h-5"
                    />
                    <span className="text-sm text-gray-700">Remove background (not yet functional)</span>
                  </label>
                </div>
              )
            ))}

            {/* Extra photos */}
            {capturedPhotos.extra.length > 0 && (
              <div className="bg-white rounded-xl p-4">
                <h3 className="font-bold text-lg text-gray-900 mb-3">
                  Extra Photos ({capturedPhotos.extra.length})
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {capturedPhotos.extra.map((photo, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={photo.dataUrl}
                        alt={`Extra ${idx + 1}`}
                        className="w-full rounded-lg"
                      />
                      <button
                        onClick={() => handleRemoveExtraPhoto(idx)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 active:bg-red-700 transition"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
    </div>
  );
}
