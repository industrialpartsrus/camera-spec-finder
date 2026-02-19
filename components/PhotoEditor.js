// components/PhotoEditor.js
// Reusable photo editor with zoom, pan, rotate, brightness, and watermark preview
// Outputs 1600x1600 square images (eBay standard) with white background

import { useState, useRef, useEffect } from 'react';

export default function PhotoEditor({
  photoUrl,
  sku,
  viewName,
  onSave,
  onCancel,
  showWatermarkOption = true
}) {
  // State
  const [rotation, setRotation] = useState(0);           // 0, 90, 180, 270
  const [brightness, setBrightness] = useState(0);       // -50 to +50
  const [zoom, setZoom] = useState(1);                   // 0.5 to 3.0
  const [pan, setPan] = useState({ x: 0, y: 0 });        // Offset in export pixels (1600x1600 scale)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showWatermark, setShowWatermark] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [logoImg, setLogoImg] = useState(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(photoUrl); // Track current image URL (changes after bg removal)

  // Refs
  const editImageRef = useRef(null);                     // Preloaded source image
  const displayCanvasRef = useRef(null);                 // 500x500 preview canvas

  // Load logo for watermark
  useEffect(() => {
    const logo = new Image();
    logo.onload = () => {
      setLogoImg(logo);
      console.log('✅ Watermark logo loaded:', logo.width, 'x', logo.height);
    };
    logo.onerror = () => {
      console.error('❌ Failed to load watermark logo from /watermarks/logo.png');
    };
    logo.src = '/watermarks/logo.png';
  }, []);

  // Preload image with CORS fallback
  useEffect(() => {
    if (!currentPhotoUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      editImageRef.current = img;
      console.log('✅ Image loaded:', img.width, 'x', img.height);
      // Trigger render by setting a dummy state (canvas will render in next effect)
      setPan(prev => ({ ...prev }));
    };

    img.onerror = async () => {
      console.log('CORS blocked, using proxy:', currentPhotoUrl);
      try {
        const proxyRes = await fetch(
          `/api/photos/proxy-image?url=${encodeURIComponent(currentPhotoUrl)}`
        );
        if (proxyRes.ok) {
          const proxyData = await proxyRes.json();
          if (proxyData.success && proxyData.dataUrl) {
            img.crossOrigin = undefined;
            img.src = proxyData.dataUrl;
          } else {
            throw new Error('Proxy returned invalid data');
          }
        } else {
          throw new Error(`Proxy failed: ${proxyRes.status}`);
        }
      } catch (err) {
        console.error('Proxy fallback failed:', err);
        alert('Failed to load image for editing.');
        onCancel();
      }
    };

    img.src = currentPhotoUrl;
  }, [currentPhotoUrl, onCancel]);

  // Render display canvas (500x500 preview)
  useEffect(() => {
    if (!editImageRef.current || !displayCanvasRef.current) return;

    const canvas = displayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = editImageRef.current;

    const displaySize = 500;
    canvas.width = displaySize;
    canvas.height = displaySize;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, displaySize, displaySize);

    ctx.save();

    // Move to center for rotation
    ctx.translate(displaySize / 2, displaySize / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply zoom and pan (scale pan from 1600x1600 to 500x500)
    const scaledPanX = pan.x * (displaySize / 1600);
    const scaledPanY = pan.y * (displaySize / 1600);
    ctx.translate(scaledPanX, scaledPanY);
    ctx.scale(zoom, zoom);

    // Apply brightness via temp canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(img, 0, 0);

    if (brightness !== 0) {
      const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, data[i] + brightness));       // R
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightness)); // G
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightness)); // B
      }
      tempCtx.putImageData(imageData, 0, 0);
    }

    // Determine drawing dimensions (rotated images swap width/height)
    const isRotated = rotation === 90 || rotation === 270;
    const imgWidth = isRotated ? img.height : img.width;
    const imgHeight = isRotated ? img.width : img.height;

    // Scale to fill canvas (crop to square)
    const scale = Math.max(displaySize / imgWidth, displaySize / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;

    ctx.drawImage(
      tempCanvas,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    ctx.restore();

    // Draw watermark preview if enabled
    if (showWatermark && logoImg) {
      console.log('🎨 Drawing watermark preview');
      drawWatermarkPreview(ctx, displaySize);
    } else if (showWatermark && !logoImg) {
      console.warn('⚠️ Watermark enabled but logo not loaded');
    }

  }, [rotation, brightness, zoom, pan, showWatermark, logoImg]);

  // Draw watermark preview (semi-transparent, NOT saved)
  function drawWatermarkPreview(ctx, canvasSize) {
    ctx.save();
    ctx.globalAlpha = 0.4; // 40% opacity

    // Semi-transparent white background box
    const boxHeight = 80;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(0, canvasSize - boxHeight, canvasSize, boxHeight);

    // Draw logo if loaded
    if (logoImg) {
      const logoHeight = 50;
      const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
      ctx.globalAlpha = 0.6;
      ctx.drawImage(logoImg, 20, canvasSize - boxHeight + 15, logoWidth, logoHeight);
    }

    // Contact info text
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('555-1234', 20, canvasSize - 15);
    ctx.font = '14px Arial';
    ctx.fillText('contact@example.com', 150, canvasSize - 15);
    ctx.fillText('www.example.com', 350, canvasSize - 15);

    ctx.restore();
  }

  // Mouse event handlers for panning
  const handleMouseDown = (e) => {
    if (!displayCanvasRef.current) return;
    setIsDragging(true);
    const rect = displayCanvasRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !displayCanvasRef.current) return;

    const rect = displayCanvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;

    // Scale delta from display size (500) to export size (1600)
    const scale = 1600 / 500;
    setPan(prev => ({
      x: prev.x + deltaX * scale,
      y: prev.y + deltaY * scale
    }));

    setDragStart({ x: currentX, y: currentY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Remove background
  const handleRemoveBg = async () => {
    if (!editImageRef.current) return;
    setIsRemovingBg(true);

    try {
      console.log('Removing background...');

      // Convert current canvas to base64
      const tempCanvas = document.createElement('canvas');
      const img = editImageRef.current;
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);
      const base64 = dataUrl.split(',')[1]; // Remove "data:image/jpeg;base64," prefix

      const response = await fetch('/api/photos/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          view: viewName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Background removal failed');
      }

      const data = await response.json();
      console.log('✅ Background removed successfully');

      // Update the image being edited to the nobg version (data URL)
      setCurrentPhotoUrl(data.dataUrl);

      // Reset transformations since we're loading a new image
      setRotation(0);
      setBrightness(0);
      setZoom(1);
      setPan({ x: 0, y: 0 });

    } catch (err) {
      console.error('Remove bg error:', err);
      alert('Background removal failed: ' + err.message);
    } finally {
      setIsRemovingBg(false);
    }
  };

  // Save edited photo (1600x1600, NO watermark)
  const handleSave = async () => {
    if (!editImageRef.current) return;
    setIsSaving(true);

    try {
      const img = editImageRef.current;

      // Create export canvas (1600x1600)
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 1600;
      exportCanvas.height = 1600;
      const ctx = exportCanvas.getContext('2d');

      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 1600, 1600);

      ctx.save();
      ctx.translate(800, 800); // Center
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // Apply brightness
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(img, 0, 0);

      if (brightness !== 0) {
        const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.max(0, Math.min(255, data[i] + brightness));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightness));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightness));
        }
        tempCtx.putImageData(imageData, 0, 0);
      }

      const isRotated = rotation === 90 || rotation === 270;
      const imgWidth = isRotated ? img.height : img.width;
      const imgHeight = isRotated ? img.width : img.height;
      const scale = Math.max(1600 / imgWidth, 1600 / imgHeight);
      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;

      ctx.drawImage(tempCanvas, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      // NOTE: Watermark NOT drawn on export canvas

      // Convert to blob
      const blob = await new Promise(resolve => {
        exportCanvas.toBlob(resolve, 'image/jpeg', 0.9);
      });

      // Upload to Firebase Storage via existing API
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });

      console.log(`Uploading edited photo: ${sku} / ${viewName}`);

      const response = await fetch('/api/photos/upload-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: sku,
          view: `${viewName}_edited`,
          imageData: base64,
          contentType: 'image/jpeg'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      console.log(`Edited photo uploaded: ${data.url}`);

      // Callback with new URL
      onSave(data.url);

    } catch (error) {
      console.error('Save photo error:', error);
      alert('Failed to save photo: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">Edit Photo - {viewName}</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Canvas Preview */}
        <div className="p-6 flex justify-center bg-gray-50">
          <canvas
            ref={displayCanvasRef}
            width={500}
            height={500}
            className="border-2 border-gray-300 rounded-lg shadow-lg cursor-move"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        {/* Controls */}
        <div className="px-6 py-4 space-y-4">
          {/* Zoom Slider */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Crop (Zoom): {zoom.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Click and drag on image to pan. Output: 1600×1600 square.
            </p>
          </div>

          {/* Rotate Buttons */}
          <div>
            <label className="block text-sm font-semibold mb-2">Rotate</label>
            <div className="flex gap-2">
              <button
                onClick={() => setRotation((rotation - 90 + 360) % 360)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                ↺ 90° Left
              </button>
              <button
                onClick={() => setRotation((rotation + 90) % 360)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                ↻ 90° Right
              </button>
              {rotation !== 0 && (
                <button
                  onClick={() => setRotation(0)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Remove Background */}
          <div>
            <label className="block text-sm font-semibold mb-2">Background</label>
            <button
              onClick={handleRemoveBg}
              disabled={isRemovingBg}
              className="w-full px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isRemovingBg ? 'Removing Background...' : '🖼️ Remove Background'}
            </button>
            <p className="text-xs text-gray-500 mt-1">
              Uses Remove.bg API to remove background and flatten to white.
            </p>
          </div>

          {/* Brightness Slider */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Brightness: {brightness > 0 ? '+' : ''}{brightness}
            </label>
            <input
              type="range"
              min="-50"
              max="50"
              value={brightness}
              onChange={(e) => setBrightness(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Watermark Preview Toggle */}
          {showWatermarkOption && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="checkbox"
                id="watermark-preview"
                checked={showWatermark}
                onChange={(e) => setShowWatermark(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="watermark-preview" className="text-sm font-semibold text-blue-900">
                Preview Watermark (not saved to image)
              </label>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-6 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
