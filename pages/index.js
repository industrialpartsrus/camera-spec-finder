import React, { useState, useRef } from 'react';
import { Search, Plus, Copy, Trash2, CheckCircle, Loader, AlertCircle, X, Camera, Upload, Send, MapPin, Globe } from 'lucide-react';

// ============================================================================
// CONDITION OPTIONS
// ============================================================================
const CONDITION_OPTIONS = [
  { value: 'new_in_box', label: 'New in Box', description: 'New in original manufacturer packaging. Unopened. 30-day warranty included.', conditionType: 'New' },
  { value: 'new_open_box', label: 'New - Open Box', description: 'New item, factory sealed broken or removed. All original components included. 30-day warranty.', conditionType: 'New Other' },
  { value: 'new_missing_hardware', label: 'New - Missing Hardware', description: 'New item, may be missing original packaging or minor hardware. Fully functional. 30-day warranty.', conditionType: 'New Other' },
  { value: 'like_new', label: 'Like New', description: 'Gently used with minimal signs of wear. Tested and fully functional. 30-day warranty.', conditionType: 'Used' },
  { value: 'good', label: 'Good Condition', description: 'Previously used, shows normal wear. Tested and fully functional. 30-day warranty.', conditionType: 'Used' },
  { value: 'fair', label: 'Fair Condition', description: 'Used item with visible wear. Tested and functional. 30-day warranty.', conditionType: 'Used' },
  { value: 'refurbished', label: 'Refurbished', description: 'Professionally refurbished and tested. 30-day warranty.', conditionType: 'Manufacturer Refurbished' },
  { value: 'for_parts', label: 'For Parts / Not Working', description: 'Sold as-is for parts or repair. No warranty. Not tested or known to be non-functional.', conditionType: 'For Parts or Not Working' }
];

const CONDITION_TYPES = ['New', 'New Other', 'Used', 'Manufacturer Refurbished', 'For Parts or Not Working'];

// ============================================================================
// COUNTRY OF ORIGIN - eBay Standard Values
// ============================================================================
const COUNTRY_OF_ORIGIN_OPTIONS = [
  'United States', 'China', 'Japan', 'Germany', 'Mexico', 'Canada', 'Italy',
  'France', 'United Kingdom', 'South Korea', 'Taiwan', 'India', 'Brazil',
  'Spain', 'Switzerland', 'Sweden', 'Austria', 'Czech Republic', 'Poland',
  'Hungary', 'Slovakia', 'Slovenia', 'Netherlands', 'Belgium', 'Denmark',
  'Finland', 'Norway', 'Ireland', 'Portugal', 'Greece', 'Turkey', 'Israel',
  'Singapore', 'Malaysia', 'Thailand', 'Vietnam', 'Indonesia', 'Philippines',
  'Australia', 'New Zealand', 'South Africa', 'Unknown'
];

// ============================================================================
// PRODUCT CATEGORIES
// ============================================================================
const PRODUCT_CATEGORIES = [
  { value: '', label: '-- Auto-Detect --' },
  { value: 'Electric Motors', label: 'Electric Motors' },
  { value: 'Servo Motors', label: 'Servo Motors' },
  { value: 'Servo Drives', label: 'Servo Drives' },
  { value: 'VFDs', label: 'VFDs / Variable Frequency Drives' },
  { value: 'PLCs', label: 'PLCs' },
  { value: 'HMIs', label: 'HMIs / Operator Interfaces' },
  { value: 'Power Supplies', label: 'Power Supplies' },
  { value: 'I/O Modules', label: 'I/O Modules' },
  { value: 'Proximity Sensors', label: 'Proximity Sensors' },
  { value: 'Photoelectric Sensors', label: 'Photoelectric Sensors' },
  { value: 'Light Curtains', label: 'Light Curtains' },
  { value: 'Pneumatic Cylinders', label: 'Pneumatic Cylinders' },
  { value: 'Pneumatic Valves', label: 'Pneumatic Valves' },
  { value: 'Hydraulic Pumps', label: 'Hydraulic Pumps' },
  { value: 'Hydraulic Valves', label: 'Hydraulic Valves' },
  { value: 'Circuit Breakers', label: 'Circuit Breakers' },
  { value: 'Contactors', label: 'Contactors' },
  { value: 'Safety Relays', label: 'Safety Relays' },
  { value: 'Encoders', label: 'Encoders' },
  { value: 'Gearboxes', label: 'Gearboxes / Reducers' },
  { value: 'Transformers', label: 'Transformers' },
  { value: 'Bearings', label: 'Bearings' }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function CameraSpecFinder() {
  const [queue, setQueue] = useState([]);
  const [brandName, setBrandName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef(null);

  // ============================================================================
  // IMAGE COMPRESSION
  // ============================================================================
  const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              const compressedReader = new FileReader();
              compressedReader.readAsDataURL(blob);
              compressedReader.onloadend = () => {
                const base64data = compressedReader.result.split(',')[1];
                resolve(base64data);
              };
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  // ============================================================================
  // IMAGE UPLOAD HANDLER
  // ============================================================================
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsProcessingImage(true);

    try {
      const base64Data = await compressImage(file, 1200, 0.8);

      const response = await fetch('/api/process-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: base64Data,
          mimeType: 'image/jpeg'
        })
      });

      const data = await response.json();
      const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';

      console.log('Image response:', text);

      const brandMatch = text.match(/BRAND:\s*([^\|]+)/i);
      const partMatch = text.match(/PART:\s*(.+)/i);

      let brand = brandMatch?.[1]?.trim() || '';
      let part = partMatch?.[1]?.trim() || '';

      if (!brand || !part) {
        const altBrand = text.match(/(?:brand|make|manufacturer)[:=\s]+([^\n,]+)/i);
        const altPart = text.match(/(?:model|part|number|p\/n|part#)[:=\s]+([^\n,]+)/i);
        brand = brand || altBrand?.[1]?.trim() || '';
        part = part || altPart?.[1]?.trim() || '';
      }

      if (brand && part) {
        setBrandName(brand);
        setPartNumber(part);
        setTimeout(() => addToQueueWithValues(brand, part), 300);
      } else if (brand || part) {
        setBrandName(brand);
        setPartNumber(part);
        alert(`Found ${brand ? 'brand' : 'part number'} only. Please enter the missing information.`);
      } else {
        alert('Could not read nameplate clearly. Please enter information manually.');
      }

    } catch (error) {
      console.error('Image error:', error);
      alert('Error reading image. Please try again or enter manually.');
    }

    setIsProcessingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ============================================================================
  // ADD TO QUEUE
  // ============================================================================
  const addToQueueWithValues = (brand, part) => {
    if (!brand.trim() || !part.trim()) {
      alert('Please enter both brand and part number');
      return;
    }

    const newItem = {
      id: Date.now(),
      brand: brand.trim(),
      partNumber: part.trim(),
      status: 'searching',
      title: '',
      metaDescription: '',
      description: '',
      specifications: {},
      productCategory: '',
      ebayCategory: '',
      ebayCategoryId: '',
      qualityFlag: '',
      metaKeywords: '',
      price: '',
      stock: '1',
      // New fields
      conditionType: 'New',
      conditionNote: 'new_in_box',
      conditionDescription: CONDITION_OPTIONS[0].description,
      countryOfOrigin: 'United States',
      shelfLocation: '',
      error: null,
      sentToSureDone: false,
      sureDoneSku: null
    };

    setQueue(prev => [...prev, newItem]);
    setBrandName('');
    setPartNumber('');

    processItem(newItem);
  };

  const addToQueue = () => addToQueueWithValues(brandName, partNumber);

  // ============================================================================
  // PROCESS ITEM - Call AI to get product info
  // ============================================================================
  const processItem = async (item) => {
    try {
      console.log('Processing item:', item.brand, item.partNumber);

      const response = await fetch('/api/search-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: item.brand,
          partNumber: item.partNumber,
          category: item.productCategory || null
        })
      });

      console.log('Response received');
      const data = await response.json();
      console.log('Data parsed, has content:', !!data.content);

      const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
      console.log('Text length:', text.length);

      let product = null;

      try {
        const directMatch = text.match(/\{[\s\S]*"title"[\s\S]*\}/);
        if (directMatch) {
          product = JSON.parse(directMatch[0]);
          console.log('Found via direct match');
        }
      } catch (e) {
        console.log('Direct match failed:', e.message);
      }

      if (!product) {
        try {
          const codeMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
          if (codeMatch && codeMatch[1]) {
            product = JSON.parse(codeMatch[1]);
            console.log('Found in code block');
          }
        } catch (e) {
          console.log('Code block match failed:', e.message);
        }
      }

      if (!product) {
        try {
          const anyMatch = text.match(/\{[\s\S]*?\}/);
          if (anyMatch) {
            product = JSON.parse(anyMatch[0]);
            console.log('Found generic JSON');
          }
        } catch (e) {
          console.log('Generic match failed:', e.message);
        }
      }

      if (!product) {
        console.error('No parseable JSON found. Raw text:', text.substring(0, 500));
        throw new Error('Could not extract product data from search results');
      }

      console.log('Product parsed successfully:', product);

      // Extract country of origin if present in specifications
      let countryOfOrigin = item.countryOfOrigin || 'United States';
      if (product.specifications?.countryoforigin) {
        countryOfOrigin = product.specifications.countryoforigin;
      }

      setQueue(prev => prev.map(q =>
        q.id === item.id ? {
          ...q,
          status: 'complete',
          title: (product.title || `${item.brand} ${item.partNumber}`).substring(0, 80),
          metaDescription: product.metaDescription || product.shortDescription || '',
          description: product.description || '',
          specifications: product.specifications || {},
          productCategory: product.productCategory || item.productCategory || '',
          ebayCategory: product.ebayCategory?.name || '',
          ebayCategoryId: product.ebayCategory?.id || '',
          qualityFlag: product.qualityFlag || 'NEEDS ATTENTION',
          metaKeywords: Array.isArray(product.metaKeywords) ? product.metaKeywords.join(', ') : (product.metaKeywords || ''),
          countryOfOrigin: countryOfOrigin
        } : q
      ));

    } catch (error) {
      console.error('Processing error:', error);
      console.error('Error stack:', error.stack);

      setQueue(prev => prev.map(q =>
        q.id === item.id ? {
          ...q,
          status: 'error',
          error: `${error.message}. Check browser console for details.`
        } : q
      ));
    }
  };

  // ============================================================================
  // UPDATE ITEM FIELD
  // ============================================================================
  const updateItemField = (itemId, field, value) => {
    setQueue(prev => prev.map(q =>
      q.id === itemId ? { ...q, [field]: value } : q
    ));
  };

  // ============================================================================
  // UPDATE CONDITION NOTE (auto-updates conditionType and description)
  // ============================================================================
  const updateConditionNote = (itemId, value) => {
    const cond = CONDITION_OPTIONS.find(c => c.value === value);
    setQueue(prev => prev.map(q =>
      q.id === itemId ? {
        ...q,
        conditionNote: value,
        conditionDescription: cond?.description || '',
        conditionType: cond?.conditionType || q.conditionType
      } : q
    ));
  };

  // ============================================================================
  // SEND TO SUREDONE
  // ============================================================================
  const sendToSureDone = async (item) => {
    setQueue(prev => prev.map(q =>
      q.id === item.id ? { ...q, status: 'sending' } : q
    ));

    try {
      const response = await fetch('/api/suredone-create-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            title: item.title,
            brand: item.brand,
            partNumber: item.partNumber,
            model: item.partNumber,
            description: item.description,
            shortDescription: item.metaDescription,
            specifications: item.specifications,
            metaKeywords: item.metaKeywords,
            productCategory: item.productCategory,
            ebayCategoryId: item.ebayCategoryId,
            condition: item.conditionType,
            conditionNotes: item.conditionDescription,
            countryOfOrigin: item.countryOfOrigin,
            shelfLocation: item.shelfLocation,
            price: item.price,
            stock: item.stock || '1'
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setQueue(prev => prev.map(q =>
          q.id === item.id ? {
            ...q,
            status: 'complete',
            sentToSureDone: true,
            sureDoneSku: result.sku
          } : q
        ));
        alert(`✓ Created in SureDone!\nSKU: ${result.sku}${result.upc ? `\nUPC: ${result.upc}` : ''}`);
      } else {
        throw new Error(result.error || 'Failed to create listing');
      }
    } catch (error) {
      console.error('SureDone error:', error);
      setQueue(prev => prev.map(q =>
        q.id === item.id ? { ...q, status: 'complete' } : q
      ));
      alert('Error sending to SureDone: ' + error.message);
    }
  };

  // ============================================================================
  // COPY TO CLIPBOARD
  // ============================================================================
  const copyToClipboard = (item) => {
    const specsText = typeof item.specifications === 'object'
      ? Object.entries(item.specifications).map(([k, v]) => `• ${k}: ${v}`).join('\n')
      : item.specifications;

    const text = `TITLE (${item.title.length}/80):
${item.title}

META DESCRIPTION:
${item.metaDescription}

DESCRIPTION:
${item.description}

SPECIFICATIONS:
${specsText}

CATEGORY: ${item.productCategory}
EBAY CATEGORY: ${item.ebayCategory}
COUNTRY OF ORIGIN: ${item.countryOfOrigin}
CONDITION: ${item.conditionType}
SHELF: ${item.shelfLocation}

QUALITY: ${item.qualityFlag}

META KEYWORDS:
${item.metaKeywords}`;

    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  // ============================================================================
  // EXPORT CSV
  // ============================================================================
  const exportCSV = () => {
    const items = queue.filter(i => i.status === 'complete');
    if (!items.length) return alert('No completed items to export');

    const headers = ['Brand', 'Part Number', 'Title', 'Meta Description', 'Description', 'Specifications', 'Category', 'eBay Category', 'Country', 'Condition', 'Shelf', 'Quality Flag', 'Meta Keywords'];
    const rows = items.map(i => [
      i.brand, i.partNumber, i.title, i.metaDescription, i.description,
      typeof i.specifications === 'object' ? JSON.stringify(i.specifications) : i.specifications,
      i.productCategory, i.ebayCategory, i.countryOfOrigin, i.conditionType, i.shelfLocation, i.qualityFlag, i.metaKeywords
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    navigator.clipboard.writeText(csv);
    alert('CSV copied! Paste in Google Sheets: A1 → Ctrl+Shift+V → Data → Split text to columns');
  };

  // ============================================================================
  // STATS
  // ============================================================================
  const stats = {
    total: queue.length,
    complete: queue.filter(q => q.status === 'complete').length,
    sentToSureDone: queue.filter(q => q.sentToSureDone).length
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Product Spec Finder with Camera</h1>
          <p className="text-gray-600 mb-6">Scan nameplates or enter product details manually</p>

          {/* Scan Nameplate */}
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-dashed border-purple-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-800">Scan Nameplate</h3>
              </div>
              {isProcessingImage && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Reading image...</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">Take a photo or upload an image to automatically extract product information</p>
            <div className="flex gap-3">
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" id="camera" />
              <label htmlFor="camera" className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer transition">
                <Camera className="w-4 h-4" />
                Take Photo
              </label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="upload" />
              <label htmlFor="upload" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer transition">
                <Upload className="w-4 h-4" />
                Upload Image
              </label>
            </div>
          </div>

          {/* Manual Entry */}
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              placeholder="Brand Name (e.g., Baldor)"
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && partNumber && addToQueue()}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Part Number (e.g., M3709T)"
              value={partNumber}
              onChange={e => setPartNumber(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && brandName && addToQueue()}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={addToQueue} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition">
              <Plus className="w-5 h-5" />
              Add to Queue
            </button>
          </div>

          {queue.length > 0 && (
            <div className="flex gap-3 flex-wrap">
              <button onClick={exportCSV} disabled={!queue.some(q => q.status === 'complete')} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 transition">
                <Copy className="w-4 h-4" />
                Copy as CSV
              </button>
              <button onClick={() => setQueue([])} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition">
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
              <span className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700">
                {stats.complete} of {stats.total} Complete
              </span>
              <span className="px-4 py-2 bg-teal-100 rounded-lg text-teal-700">
                {stats.sentToSureDone} Sent to SureDone
              </span>
            </div>
          )}
        </div>

        {/* Queue Items */}
        <div className="space-y-4">
          {queue.map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {item.status === 'searching' && <Loader className="w-5 h-5 text-blue-500 animate-spin" />}
                  {item.status === 'sending' && <Loader className="w-5 h-5 text-teal-500 animate-spin" />}
                  {item.status === 'complete' && !item.sentToSureDone && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {item.status === 'complete' && item.sentToSureDone && <Send className="w-5 h-5 text-teal-600" />}
                  {item.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{item.brand} {item.partNumber}</h3>
                    <p className="text-sm text-gray-500">
                      {item.status === 'searching' && 'Searching for specifications...'}
                      {item.status === 'sending' && 'Sending to SureDone...'}
                      {item.status === 'complete' && !item.sentToSureDone && 'Complete - Ready to send'}
                      {item.status === 'complete' && item.sentToSureDone && `✓ Sent to SureDone (SKU: ${item.sureDoneSku})`}
                      {item.status === 'error' && `Error: ${item.error}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {item.status === 'complete' && (
                    <>
                      <button onClick={() => copyToClipboard(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Copy to clipboard">
                        <Copy className="w-5 h-5" />
                      </button>
                      {!item.sentToSureDone && (
                        <button onClick={() => sendToSureDone(item)} className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition" title="Send to SureDone">
                          <Send className="w-5 h-5" />
                        </button>
                      )}
                    </>
                  )}
                  <button onClick={() => setQueue(prev => prev.filter(q => q.id !== item.id))} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Remove">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {item.status === 'complete' && (
                <div className="space-y-4">
                  {item.qualityFlag === 'NEEDS ATTENTION' && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                      <p className="text-sm font-semibold text-yellow-800">⚠️ Quality Check: NEEDS ATTENTION</p>
                      <p className="text-xs text-yellow-700">Some information may be missing - please verify</p>
                    </div>
                  )}
                  {item.qualityFlag === 'STRONG' && (
                    <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded">
                      <p className="text-sm font-semibold text-green-800">✓ Quality Check: STRONG</p>
                    </div>
                  )}

                  {/* Price, Stock, Shelf Location */}
                  <div className="grid md:grid-cols-3 gap-4 bg-blue-50 p-4 rounded-lg">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Price ($) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={e => updateItemField(item.id, 'price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Stock Quantity</label>
                      <input
                        type="number"
                        value={item.stock}
                        onChange={e => updateItemField(item.id, 'stock', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> Shelf Location
                      </label>
                      <input
                        type="text"
                        value={item.shelfLocation || ''}
                        onChange={e => updateItemField(item.id, 'shelfLocation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., A-12"
                      />
                    </div>
                  </div>

                  {/* Country of Origin & Product Category */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                        <Globe className="w-4 h-4" /> Country of Origin *
                      </label>
                      <select
                        value={item.countryOfOrigin || 'United States'}
                        onChange={e => updateItemField(item.id, 'countryOfOrigin', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {COUNTRY_OF_ORIGIN_OPTIONS.map(country => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Product Category</label>
                      <select
                        value={item.productCategory || ''}
                        onChange={e => updateItemField(item.id, 'productCategory', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {PRODUCT_CATEGORIES.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Condition */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Condition *</label>
                      <select
                        value={item.conditionType}
                        onChange={e => updateItemField(item.id, 'conditionType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {CONDITION_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Condition Note</label>
                      <select
                        value={item.conditionNote}
                        onChange={e => updateConditionNote(item.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded text-sm">
                    <p>{item.conditionDescription}</p>
                  </div>

                  {/* Title */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1">
                      Product Title <span className="text-sm text-gray-500">({item.title?.length || 0}/80 characters)</span>
                    </h4>
                    <p className="text-gray-800 bg-gray-50 p-3 rounded">{item.title}</p>
                  </div>

                  {/* Meta Description */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1">Meta Description</h4>
                    <p className="text-gray-800 bg-gray-50 p-3 rounded text-sm">{item.metaDescription}</p>
                  </div>

                  {/* Technical Description */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1">Technical Description</h4>
                    <div className="text-gray-800 bg-gray-50 p-3 rounded text-sm max-h-60 overflow-y-auto" dangerouslySetInnerHTML={{ __html: item.description }} />
                  </div>

                  {/* Specifications */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1">Specifications</h4>
                    <div className="bg-gray-50 p-3 rounded space-y-1 max-h-40 overflow-y-auto">
                      {typeof item.specifications === 'object' ? (
                        Object.entries(item.specifications).map(([k, v]) => (
                          <div key={k} className="text-gray-800 text-sm">• <strong>{k}:</strong> {String(v)}</div>
                        ))
                      ) : (
                        <p className="text-gray-800 text-sm">{item.specifications}</p>
                      )}
                    </div>
                  </div>

                  {/* eBay Category & Meta Keywords */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-1">eBay Category</h4>
                      <p className="text-gray-800 bg-gray-50 p-3 rounded text-sm">{item.ebayCategory} {item.ebayCategoryId ? `(${item.ebayCategoryId})` : ''}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-1">Meta Keywords</h4>
                      <p className="text-gray-800 bg-gray-50 p-3 rounded text-sm">{item.metaKeywords}</p>
                    </div>
                  </div>

                  {/* Send to SureDone Button */}
                  {!item.sentToSureDone && (
                    <div className="flex justify-end pt-4 border-t">
                      <button
                        onClick={() => sendToSureDone(item)}
                        className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2 font-medium transition"
                      >
                        <Send className="w-5 h-5" />
                        Send to SureDone
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {queue.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Ready to Search</h3>
            <p className="text-gray-500">Scan a nameplate or enter product details to begin</p>
          </div>
        )}
      </div>
    </div>
  );
}
