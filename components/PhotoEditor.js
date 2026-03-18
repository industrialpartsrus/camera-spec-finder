// components/PhotoEditor.js
// Photo editor: zoom, pan, rotate, brightness, background removal, watermark preview
// Outputs 2000x2000 JPEG images for eBay listings
//
// COORDINATE SYSTEM:
// - pan is stored in DISPLAY pixels (canvas is 500x500)
// - pan is applied BEFORE rotation so dragging right always moves image right on screen
// - zoom=1.0 means "fill the frame" (image fills canvas edge-to-edge)
// - Export canvas is 2000x2000 — pan is scaled up by 4x (2000/500) for export

import { useState, useRef, useEffect } from 'react';

const OUTPUT_SIZE = 2000;
const DISPLAY_SIZE = 500;
const PAN_SCALE = OUTPUT_SIZE / DISPLAY_SIZE; // 4

function getFillScale(imgW, imgH, rotDeg, canvasSize) {
  const isRotated = rotDeg === 90 || rotDeg === 270;
  const effectiveW = isRotated ? imgH : imgW;
  const effectiveH = isRotated ? imgW : imgH;
  return Math.max(canvasSize / effectiveW, canvasSize / effectiveH);
}

function drawImageToCtx(ctx, img, canvasSize, rotDeg, zoomMultiplier, panPx, brightnessDelta) {
  const tmp = document.createElement('canvas');
  tmp.width = img.width;
  tmp.height = img.height;
  const tmpCtx = tmp.getContext('2d');
  tmpCtx.drawImage(img, 0, 0);

  if (brightnessDelta !== 0) {
    const id = tmpCtx.getImageData(0, 0, img.width, img.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i]   = Math.max(0, Math.min(255, d[i]   + brightnessDelta));
      d[i+1] = Math.max(0, Math.min(255, d[i+1] + brightnessDelta));
      d[i+2] = Math.max(0, Math.min(255, d[i+2] + brightnessDelta));
    }
    tmpCtx.putImageData(id, 0, 0);
  }

  const fillScale = getFillScale(img.width, img.height, rotDeg, canvasSize);
  const totalScale = fillScale * zoomMultiplier;

  ctx.save();
  ctx.translate(canvasSize / 2 + panPx.x, canvasSize / 2 + panPx.y);
  ctx.rotate((rotDeg * Math.PI) / 180);
  ctx.scale(totalScale, totalScale);
  ctx.drawImage(tmp, -img.width / 2, -img.height / 2, img.width, img.height);
  ctx.restore();
}

export default function PhotoEditor({
  photoUrl, sku, viewName, onSave, onCancel, showWatermarkOption = true
}) {
  const [rotation, setRotation]     = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [zoom, setZoom]             = useState(1);
  const [pan, setPan]               = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart]   = useState({ x: 0, y: 0 });
  const [showWatermark, setShowWatermark] = useState(false);
  const [isSaving, setIsSaving]     = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(photoUrl);
  const [showBgOptions, setShowBgOptions] = useState(false);
  const [selectedBg, setSelectedBg] = useState('white');
  const [autoCropCenter, setAutoCropCenter] = useState(true);
  const [productScale, setProductScale] = useState(80);
  const [imageLoadId, setImageLoadId] = useState(0);

  const editImageRef      = useRef(null);
  const displayCanvasRef  = useRef(null);
  const watermarkLogoRef  = useRef(null);
  const watermarkContactRef = useRef(null);

  useEffect(() => {
    const logo = new Image();
    logo.src = '/watermarks/logo.png';
    logo.onload = () => { watermarkLogoRef.current = logo; };
    const contact = new Image();
    contact.src = '/watermarks/contact-info.png';
    contact.onload = () => { watermarkContactRef.current = contact; };
  }, []);

  useEffect(() => {
    if (!currentPhotoUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      editImageRef.current = img;
      console.log('Image loaded:', img.width, 'x', img.height);
      setImageLoadId(prev => prev + 1);
    };
    img.onerror = async () => {
      try {
        const r = await fetch(`/api/photos/proxy-image?url=${encodeURIComponent(currentPhotoUrl)}`);
        if (!r.ok) throw new Error(`Proxy failed: ${r.status}`);
        const d = await r.json();
        if (!d.success || !d.dataUrl) throw new Error('Proxy invalid');
        img.crossOrigin = undefined;
        img.src = d.dataUrl;
      } catch (err) {
        alert('Failed to load image for editing.');
        onCancel();
      }
    };
    img.src = currentPhotoUrl;
  }, [currentPhotoUrl, onCancel]);

  useEffect(() => {
    if (!editImageRef.current) return;
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [imageLoadId]);

  useEffect(() => {
    if (!editImageRef.current || !displayCanvasRef.current) return;
    const canvas = displayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = DISPLAY_SIZE;
    canvas.height = DISPLAY_SIZE;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE);
    drawImageToCtx(ctx, editImageRef.current, DISPLAY_SIZE, rotation, zoom, pan, brightness);
    if (showWatermark) drawWatermarkPreview(ctx, DISPLAY_SIZE);
  }, [rotation, brightness, zoom, pan, showWatermark, imageLoadId]);

  function drawWatermarkPreview(ctx, size) {
    ctx.save();
    if (watermarkLogoRef.current) {
      const logo = watermarkLogoRef.current;
      const w = Math.round(size * 0.32);
      const h = Math.round(w * (logo.height / logo.width));
      ctx.globalAlpha = 0.6;
      ctx.drawImage(logo, 20, 20, w, h);
    }
    if (watermarkContactRef.current) {
      ctx.globalAlpha = 0.6;
      ctx.drawImage(watermarkContactRef.current, 0, 0, size, size);
    }
    ctx.restore();
  }

  const handleMouseDown = (e) => {
    if (!displayCanvasRef.current) return;
    setIsDragging(true);
    const r = displayCanvasRef.current.getBoundingClientRect();
    setDragStart({ x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const handleMouseMove = (e) => {
    if (!isDragging || !displayCanvasRef.current) return;
    const r = displayCanvasRef.current.getBoundingClientRect();
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;
    setPan(prev => ({ x: prev.x + cx - dragStart.x, y: prev.y + cy - dragStart.y }));
    setDragStart({ x: cx, y: cy });
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1 || !displayCanvasRef.current) return;
    e.preventDefault();
    const t = e.touches[0];
    const r = displayCanvasRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragStart({ x: t.clientX - r.left, y: t.clientY - r.top });
  };
  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1 || !displayCanvasRef.current) return;
    e.preventDefault();
    const t = e.touches[0];
    const r = displayCanvasRef.current.getBoundingClientRect();
    const cx = t.clientX - r.left;
    const cy = t.clientY - r.top;
    setPan(prev => ({ x: prev.x + cx - dragStart.x, y: prev.y + cy - dragStart.y }));
    setDragStart({ x: cx, y: cy });
  };
  const handleTouchEnd = () => setIsDragging(false);

  const handleRemoveBg = async () => {
    if (!editImageRef.current) return;
    setIsRemovingBg(true);
    setShowBgOptions(false);
    try {
      const img = editImageRef.current;
      const tmp = document.createElement('canvas');
      tmp.width = img.width; tmp.height = img.height;
      tmp.getContext('2d').drawImage(img, 0, 0);
      const base64 = tmp.toDataURL('image/jpeg', 0.95).split(',')[1];
      const res = await fetch('/api/photos/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, view: viewName, background: selectedBg, autoCrop: autoCropCenter, scale: productScale })
      });
      if (!res.ok) throw new Error(`Background removal failed: ${res.status}`);
      const data = await res.json();
      setCurrentPhotoUrl(data.dataUrl);
    } catch (err) {
      alert('Background removal failed: ' + err.message);
    } finally {
      setIsRemovingBg(false);
    }
  };

  function sharpenImage(ctx, w, h, amount = 0.2) {
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    const copy = new Uint8ClampedArray(d);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          const center = copy[i+c] * (1 + 4 * amount);
          const nbrs = (copy[((y-1)*w+x)*4+c] + copy[((y+1)*w+x)*4+c] + copy[(y*w+x-1)*4+c] + copy[(y*w+x+1)*4+c]) * amount;
          d[i+c] = Math.min(255, Math.max(0, center - nbrs));
        }
      }
    }
    ctx.putImageData(id, 0, 0);
  }

  const handleSave = async () => {
    if (!editImageRef.current) return;
    setIsSaving(true);
    try {
      const img = editImageRef.current;
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = OUTPUT_SIZE;
      exportCanvas.height = OUTPUT_SIZE;
      const ctx = exportCanvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      const exportPan = { x: pan.x * PAN_SCALE, y: pan.y * PAN_SCALE };
      drawImageToCtx(ctx, img, OUTPUT_SIZE, rotation, zoom, exportPan, brightness);
      sharpenImage(ctx, OUTPUT_SIZE, OUTPUT_SIZE, 0.2);
      const blob = await new Promise(r => exportCanvas.toBlob(r, 'image/jpeg', 0.92));
      const base64 = await new Promise(r => {
        const reader = new FileReader();
        reader.onloadend = () => r(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });
      const res = await fetch('/api/photos/upload-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, view: `${viewName}_edited`, imageData: base64, contentType: 'image/jpeg' })
      });
      if (!res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const e = await res.json();
          throw new Error(e.error || `Upload failed (${res.status})`);
        }
        throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      onSave(data.url);
    } catch (error) {
      alert('Failed to save photo: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">

        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">Edit Photo — {viewName}</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <div className="p-6 flex justify-center bg-gray-50">
          <canvas
            ref={displayCanvasRef}
            width={DISPLAY_SIZE}
            height={DISPLAY_SIZE}
            className="border-2 border-gray-300 rounded-lg shadow-lg"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>

        <div className="px-6 py-4 space-y-4">

          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <label className="block text-sm font-semibold mb-2">
              ☀️ Brightness: {brightness > 0 ? '+' : ''}{brightness}
            </label>
            <input type="range" min="-50" max="50" value={brightness}
              onChange={e => setBrightness(parseInt(e.target.value))} className="w-full" />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Darker</span><span>0</span><span>Brighter</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              🔍 Zoom: {zoom.toFixed(2)}x
              <span className="font-normal text-gray-500 text-xs ml-2">(1.00 = fill frame · drag canvas to pan)</span>
            </label>
            <input type="range" min="0.5" max="3" step="0.05" value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))} className="w-full" />
            <div className="flex gap-2 mt-2 flex-wrap">
              {[
                { label: 'Reset', fn: () => { setZoom(1); setPan({ x: 0, y: 0 }); } },
                { label: 'Center', fn: () => setPan({ x: 0, y: 0 }) },
                { label: '1.5x', fn: () => setZoom(1.5) },
                { label: '2x',   fn: () => setZoom(2) },
                { label: '3x',   fn: () => setZoom(3) },
              ].map(b => (
                <button key={b.label} onClick={b.fn}
                  className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 font-medium">
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">🔄 Rotate <span className="font-normal text-gray-500 text-xs">({rotation}°)</span></label>
            <div className="flex gap-2">
              <button onClick={() => setRotation(r => (r - 90 + 360) % 360)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">↺ 90° Left</button>
              <button onClick={() => setRotation(r => (r + 90) % 360)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">↻ 90° Right</button>
              {rotation !== 0 && (
                <button onClick={() => setRotation(0)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Reset</button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">🖼️ Background</label>
            {!showBgOptions ? (
              <button onClick={() => setShowBgOptions(true)} disabled={isRemovingBg}
                className="w-full px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 disabled:opacity-50 font-medium">
                {isRemovingBg ? '⏳ Processing...' : '🖼️ Remove Background'}
              </button>
            ) : (
              <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
                <h4 className="font-medium mb-3 text-sm">Background Options</h4>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { id: 'white', label: 'White', preview: '#ffffff' },
                    { id: 'transparent', label: 'Transparent', preview: 'checkerboard' },
                    { id: 'lightgray', label: 'Light Gray', preview: '#f5f5f5' },
                    { id: 'warehouse', label: 'Warehouse', preview: '/bg-templates/warehouse-floor.jpg' },
                    { id: 'studio', label: 'Studio', preview: '/bg-templates/studio-gradient.jpg' },
                    { id: 'industrial', label: 'Industrial', preview: '/bg-templates/industrial.jpg' },
                  ].map(bg => (
                    <button key={bg.id} type="button" onClick={() => setSelectedBg(bg.id)}
                      className={`p-2 rounded border-2 text-center text-xs transition ${selectedBg === bg.id ? 'border-green-500 bg-green-100 shadow-md' : 'border-gray-200 hover:border-gray-400 bg-white'}`}>
                      <div className="w-full h-12 rounded mb-1 border border-gray-300" style={{
                        background: bg.preview.startsWith('#') ? bg.preview
                          : bg.preview === 'checkerboard' ? 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 16px 16px'
                          : `url(${bg.preview}) center/cover`
                      }} />
                      <span className="font-medium">{bg.label}</span>
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input type="checkbox" checked={autoCropCenter}
                    onChange={e => setAutoCropCenter(e.target.checked)} className="w-4 h-4 rounded" />
                  <span className="text-sm font-medium">Auto-crop & center product</span>
                </label>
                {autoCropCenter && (
                  <div className="mb-4">
                    <label className="text-sm text-gray-600 font-medium mb-1 block">Product scale: {productScale}%</label>
                    <input type="range" min="50" max="95" step="5" value={productScale}
                      onChange={e => setProductScale(parseInt(e.target.value))} className="w-full" />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>More whitespace</span><span>Fills frame</span>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={handleRemoveBg} disabled={isRemovingBg}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
                    {isRemovingBg ? '⏳ Processing...' : '🖼️ Remove Background'}
                  </button>
                  <button onClick={() => setShowBgOptions(false)} disabled={isRemovingBg}
                    className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium">
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">💡 Silver/white parts work best against a blue or gray backdrop.</p>
              </div>
            )}
          </div>

          {showWatermarkOption && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="wm-preview" checked={showWatermark}
                  onChange={e => setShowWatermark(e.target.checked)} className="w-4 h-4" />
                <label htmlFor="wm-preview" className="text-sm font-semibold text-blue-900">
                  Preview Watermark (not saved to image)
                </label>
              </div>
              {showWatermark && (
                <p className="text-xs text-blue-700 mt-2">
                  ℹ️ Watermark is always at the <strong>top-left corner</strong> of the exported image, regardless of pan position.
                </p>
              )}
            </div>
          )}

        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button onClick={onCancel} disabled={isSaving}
            className="px-6 py-2 border rounded hover:bg-gray-100 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={isSaving}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
            {isSaving ? 'Saving...' : 'Save Photo'}
          </button>
        </div>

      </div>
    </div>
  );
}
