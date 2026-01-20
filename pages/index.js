import React, { useState, useRef } from 'react';
import { Search, Plus, Copy, Trash2, CheckCircle, Loader, AlertCircle, X, Camera, Upload, Send } from 'lucide-react';

export default function CameraSpecFinder() {
  const [queue, setQueue] = useState([]);
  const [brandName, setBrandName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsProcessingImage(true);

    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });

      // Call YOUR API route instead of Anthropic directly (secure!)
      const response = await fetch('/api/process-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageData: base64Data, 
          mimeType: file.type || 'image/jpeg' 
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
      specifications: [],
      ebayCategory: '',
      qualityFlag: '',
      metaKeywords: '',
      price: '',
      stock: '1',
      error: null,
      sentToSureDone: false
    };

    setQueue(prev => [...prev, newItem]);
    setBrandName('');
    setPartNumber('');
    
    processItem(newItem);
  };

  const addToQueue = () => addToQueueWithValues(brandName, partNumber);

  const processItem = async (item) => {
    try {
      console.log('Processing item:', item.brand, item.partNumber);
      
      // Call YOUR API route for product search
      const response = await fetch('/api/search-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          brand: item.brand, 
          partNumber: item.partNumber 
        })
      });

      console.log('Response received');
      const data = await response.json();
      console.log('Data parsed, has content:', !!data.content);
      console.log('Full API response:', JSON.stringify(data, null, 2));
      
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

      console.log('Product parsed successfully');

      setQueue(prev => prev.map(q => 
        q.id === item.id ? {
          ...q,
          status: 'complete',
          title: (product.title || `${item.brand} ${item.partNumber}`).substring(0, 80),
          metaDescription: product.metaDescription || '',
          description: product.description || '',
          specifications: Array.isArray(product.specifications) ? product.specifications : [],
          ebayCategory: product.ebayCategory || '',
          qualityFlag: product.qualityFlag || 'NEEDS ATTENTION',
          metaKeywords: product.metaKeywords || ''
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

  const sendToSureDone = async (item) => {
    if (!item.price || parseFloat(item.price) <= 0) {
      alert('Please enter a price before sending to SureDone');
      return;
    }

    setQueue(prev => prev.map(q => 
      q.id === item.id ? { ...q, status: 'sending' } : q
    ));

    try {
      const response = await fetch('/api/suredone-create-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            sku: `${item.brand}-${item.partNumber}`.replace(/\s+/g, '-'),
            brand: item.brand,
            partNumber: item.partNumber,
            title: item.title,
            description: item.description,
            specifications: item.specifications,
            ebayCategory: item.ebayCategory,
            metaKeywords: item.metaKeywords,
            price: item.price,
            stock: item.stock
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setQueue(prev => prev.map(q => 
          q.id === item.id ? { 
            ...q, 
            status: 'complete', 
            sentToSureDone: true 
          } : q
        ));
        alert(`✓ Successfully sent to SureDone! SKU: ${data.sku}`);
      } else {
        throw new Error(data.error || 'Failed to create listing');
      }

    } catch (error) {
      console.error('SureDone error:', error);
      setQueue(prev => prev.map(q => 
        q.id === item.id ? { 
          ...q, 
          status: 'complete',
          error: `SureDone error: ${error.message}` 
        } : q
      ));
      alert(`Error sending to SureDone: ${error.message}`);
    }
  };

  const updateItemField = (id, field, value) => {
    setQueue(prev => prev.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const copyToClipboard = (item) => {
    const text = `TITLE (${item.title.length}/80):
${item.title}

META DESCRIPTION:
${item.metaDescription}

DESCRIPTION:
${item.description}

SPECIFICATIONS:
${item.specifications.map(s => `• ${s}`).join('\n')}

EBAY CATEGORY:
${item.ebayCategory}

QUALITY: ${item.qualityFlag}

META KEYWORDS:
${item.metaKeywords}

PRICE: $${item.price}
STOCK: ${item.stock}`;

    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const exportCSV = () => {
    const items = queue.filter(i => i.status === 'complete');
    if (!items.length) return alert('No completed items to export');

    const headers = ['Brand', 'Part Number', 'Title', 'Meta Description', 'Description', 'Specifications', 'eBay Category', 'Quality Flag', 'Meta Keywords', 'Price', 'Stock', 'Sent to SureDone'];
    const rows = items.map(i => [
      i.brand, i.partNumber, i.title, i.metaDescription, i.description,
      i.specifications.join(' | '), i.ebayCategory, i.qualityFlag, i.metaKeywords,
      i.price, i.stock, i.sentToSureDone ? 'Yes' : 'No'
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
    navigator.clipboard.writeText(csv);
    alert('CSV copied! Paste in Google Sheets: A1 → Ctrl+Shift+V → Data → Split text to columns');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Product Spec Finder with SureDone</h1>
          <p className="text-gray-600 mb-6">Scan nameplates, gather specs, and send directly to SureDone</p>

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
            <div className="flex gap-3">
              <button onClick={exportCSV} disabled={!queue.some(q => q.status === 'complete')} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 transition">
                <Copy className="w-4 h-4" />
                Copy as CSV
              </button>
              <button onClick={() => setQueue([])} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition">
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
              <span className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700">
                {queue.filter(q => q.status === 'complete').length} of {queue.length} Complete
              </span>
              <span className="px-4 py-2 bg-green-100 rounded-lg text-green-700">
                {queue.filter(q => q.sentToSureDone).length} Sent to SureDone
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {queue.map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {item.status === 'searching' && <Loader className="w-5 h-5 text-blue-500 animate-spin" />}
                  {item.status === 'sending' && <Loader className="w-5 h-5 text-green-500 animate-spin" />}
                  {item.status === 'complete' && !item.sentToSureDone && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {item.status === 'complete' && item.sentToSureDone && <Send className="w-5 h-5 text-green-600" />}
                  {item.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{item.brand} {item.partNumber}</h3>
                    <p className="text-sm text-gray-500">
                      {item.status === 'searching' && 'Searching for specifications...'}
                      {item.status === 'sending' && 'Sending to SureDone...'}
                      {item.status === 'complete' && !item.sentToSureDone && 'Complete - Ready to send'}
                      {item.status === 'complete' && item.sentToSureDone && '✓ Sent to SureDone'}
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
                        <button onClick={() => sendToSureDone(item)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" title="Send to SureDone">
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

                  <div className="grid md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
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
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1">
                      Product Title <span className="text-sm text-gray-500">({item.title.length}/80 characters)</span>
                    </h4>
                    <p className="text-gray-800 bg-gray-50 p-3 rounded">{item.title}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1">Meta Description</h4>
                    <p className="text-gray-800 bg-gray-50 p-3 rounded text-sm">{item.metaDescription}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1">Technical Description</h4>
                    <p className="text-gray-800 bg-gray-50 p-3 rounded text-sm">{item.description}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1">Specifications</h4>
                    <ul className="list-disc list-inside bg-gray-50 p-3 rounded space-y-1">
                      {item.specifications.map((spec, idx) => (
                        <li key={idx} className="text-gray-800 text-sm">{spec}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-1">eBay Category</h4>
                      <p className="text-gray-800 bg-gray-50 p-3 rounded text-sm">{item.ebayCategory}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-1">Meta Keywords</h4>
                      <p className="text-gray-800 bg-gray-50 p-3 rounded text-sm">{item.metaKeywords}</p>
                    </div>
                  </div>
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
