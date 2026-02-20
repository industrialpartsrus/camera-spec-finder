// components/PhotoEditor.js
// Reusable photo editor with zoom, pan, rotate, brightness, and watermark preview
// Outputs 2000x2000 square images (eBay standard) with white background

import { useState, useRef, useEffect } from 'react';

// Output canvas size (2000x2000 for high quality eBay images)
const OUTPUT_SIZE = 2000;

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
  const [pan, setPan] = useState({ x: 0, y: 0 });        // Offset in export pixels (OUTPUT_SIZE scale)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showWatermark, setShowWatermark] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(photoUrl); // Track current image URL (changes after bg removal)

  // Refs
  const editImageRef = useRef(null);                     // Preloaded source image
  const displayCanvasRef = useRef(null);                 // 500x500 preview canvas
  const watermarkLogoRef = useRef(null);                 // Watermark logo PNG
  const watermarkContactRef = useRef(null);              // Watermark contact info PNG

  // Load watermark images
  useEffect(() => {
    const logo = new Image();
    logo.src = '/watermarks/logo.png';
    logo.onload = () => {
      watermarkLogoRef.current = logo;
      console.log('✅ Watermark logo loaded:', logo.width, 'x', logo.height);
    };
    logo.onerror = () => {
      console.error('❌ Failed to load watermark logo from /watermarks/logo.png');
    };

    const contact = new Image();
    contact.src = '/watermarks/contact-info.png';
    contact.onload = () => {
      watermarkContactRef.current = contact;
      console.log('✅ Watermark contact loaded:', contact.width, 'x', contact.height);
    };
    contact.onerror = () => {
      console.error('❌ Failed to load watermark contact from /watermarks/contact-info.png');
    };
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

  // Auto-zoom to fill frame when image loads
  useEffect(() => {
    if (!editImageRef.current) return;

    const img = editImageRef.current;
    const isRotated = Math.abs(rotation) % 180 !== 0;
    const imgW = isRotated ? img.height : img.width;
    const imgH = isRotated ? img.width : img.height;

    // Calculate fit and fill scales
    const fitScale = Math.min(OUTPUT_SIZE / imgW, OUTPUT_SIZE / imgH);
    const fillScale = Math.max(OUTPUT_SIZE / imgW, OUTPUT_SIZE / imgH);

    // Default zoom: 85% toward fill (shows product larger without excessive cropping)
    const autoZoom = Math.min((fillScale / fitScale) * 0.85, 2.0);

    setZoom(autoZoom);
    setPan({ x: 0, y: 0 }); // Reset pan when auto-zooming
  }, [editImageRef.current, rotation]);

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

    // Apply zoom and pan (scale pan from OUTPUT_SIZE to displaySize)
    const scaledPanX = pan.x * (displaySize / OUTPUT_SIZE);
    const scaledPanY = pan.y * (displaySize / OUTPUT_SIZE);
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
    if (showWatermark) {
      if (watermarkLogoRef.current || watermarkContactRef.current) {
        console.log('🎨 Drawing watermark preview');
        drawWatermarkPreview(ctx, displaySize);
      } else {
        console.warn('⚠️ Watermark enabled but images not loaded');
      }
    }

  }, [rotation, brightness, zoom, pan, showWatermark]);

  // Draw watermark preview (semi-transparent, NOT saved)
  // Matches server-side watermark.js positioning
  function drawWatermarkPreview(ctx, canvasSize) {
    ctx.save();

    // LOGO: top-left corner, 22% width, 20px padding from edges
    if (watermarkLogoRef.current) {
      const logo = watermarkLogoRef.current;
      const logoWidth = Math.round(canvasSize * 0.22);
      const logoHeight = Math.round(logoWidth * (logo.height / logo.width));

      ctx.globalAlpha = 0.5; // 50% opacity for preview (server uses 85%)
      ctx.drawImage(logo, 20, 20, logoWidth, logoHeight);
    }

    // CONTACT INFO: pre-rendered PNG at full canvas size
    // The PNG itself has text positioned at the bottom
    // Drawing at full size ensures correct positioning
    if (watermarkContactRef.current) {
      ctx.globalAlpha = 0.5; // 50% opacity for preview
      ctx.drawImage(watermarkContactRef.current, 0, 0, canvasSize, canvasSize);
    }

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

  // Sharpen image after scaling to recover quality
  const sharpenImage = (ctx, width, height, amount = 0.2) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const copy = new Uint8ClampedArray(data);

    const w = width;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          // Unsharp mask: enhance difference from neighbors
          const center = copy[i + c] * (1 + 4 * amount);
          const neighbors = (
            copy[((y - 1) * w + x) * 4 + c] +
            copy[((y + 1) * w + x) * 4 + c] +
            copy[(y * w + x - 1) * 4 + c] +
            copy[(y * w + x + 1) * 4 + c]
          ) * amount;
          data[i + c] = Math.min(255, Math.max(0, center - neighbors));
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  };

  // Save edited photo (OUTPUT_SIZE x OUTPUT_SIZE, NO watermark)
  const handleSave = async () => {
    if (!editImageRef.current) return;
    setIsSaving(true);

    try {
      const img = editImageRef.current;

      // Create export canvas (OUTPUT_SIZE x OUTPUT_SIZE)
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = OUTPUT_SIZE;
      exportCanvas.height = OUTPUT_SIZE;
      const ctx = exportCanvas.getContext('2d');

      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      ctx.save();
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2); // Center
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
      const scale = Math.max(OUTPUT_SIZE / imgWidth, OUTPUT_SIZE / imgHeight);
      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;

      ctx.drawImage(tempCanvas, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      // Apply subtle sharpening to recover scaling quality
      sharpenImage(ctx, OUTPUT_SIZE, OUTPUT_SIZE, 0.2);

      // NOTE: Watermark NOT drawn on export canvas

      // Detect if PNG should be used (nobg images or original PNGs)
      const isPng = currentPhotoUrl.includes('.png') || currentPhotoUrl.includes('_nobg') || viewName.includes('nobg');
      const mimeType = isPng ? 'image/png' : 'image/jpeg';
      const quality = isPng ? undefined : 1.0; // Maximum quality for JPEG, undefined for PNG

      console.log(`Exporting as ${mimeType} with ${quality ? 'quality ' + quality : 'lossless PNG'}`);

      // Convert to blob
      const blob = await new Promise(resolve => {
        exportCanvas.toBlob(resolve, mimeType, quality);
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
              Click and drag on image to pan. Output: {OUTPUT_SIZE}×{OUTPUT_SIZE} square.
            </p>
            {/* Zoom presets */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  setZoom(1.0);
                  setPan({ x: 0, y: 0 });
                }}
                className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 font-medium"
              >
                Fit
              </button>
              <button
                onClick={() => {
                  // Calculate fill zoom
                  if (editImageRef.current) {
                    const img = editImageRef.current;
                    const isRotated = Math.abs(rotation) % 180 !== 0;
                    const imgW = isRotated ? img.height : img.width;
                    const imgH = isRotated ? img.width : img.height;
                    const fitScale = Math.min(OUTPUT_SIZE / imgW, OUTPUT_SIZE / imgH);
                    const fillScale = Math.max(OUTPUT_SIZE / imgW, OUTPUT_SIZE / imgH);
                    setZoom(fillScale / fitScale);
                    setPan({ x: 0, y: 0 });
                  }
                }}
                className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 font-medium"
              >
                Fill
              </button>
              <button
                onClick={() => {
                  setZoom(1.5);
                  setPan({ x: 0, y: 0 });
                }}
                className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 font-medium"
              >
                1.5x
              </button>
              <button
                onClick={() => {
                  setZoom(2.0);
                  setPan({ x: 0, y: 0 });
                }}
                className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 font-medium"
              >
                2x
              </button>
            </div>
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
