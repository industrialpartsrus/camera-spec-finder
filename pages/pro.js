import React, { useState, useRef } from 'react';
import { Search, Plus, Trash2, CheckCircle, Loader, AlertCircle, X, Camera, Upload, User, Edit2 } from 'lucide-react';

const CONDITION_OPTIONS = [
  { value: 'new_in_box', label: 'New In Box (NIB)' },
  { value: 'new_open_box', label: 'New - Open Box (NOBOX)' },
  { value: 'new_missing_hardware', label: 'New - Missing Hardware (NMISS)' },
  { value: 'like_new_excellent', label: 'Excellent - Barely Used (LN-EX)' },
  { value: 'used_very_good', label: 'Used - Very Good (VG)' },
  { value: 'used_good', label: 'Used - Good (GOOD)' },
  { value: 'used_fair', label: 'Used - Fair (FAIR)' },
  { value: 'for_parts', label: 'For Parts or Not Working (FPNW)' }
];

const CONDITION_NOTES = {
  'new_in_box': 'New item in original manufacturer packaging. Unopened and unused. Includes all original components, manuals, and hardware. We warranty all items for 30 days.',
  'new_open_box': 'New item, factory seal broken or packaging removed. All original components included. Never used. We warranty all items for 30 days.',
  'new_missing_hardware': 'New item, may be missing original packaging, manuals, or minor hardware. Fully functional and unused. We warranty all items for 30 days.',
  'like_new_excellent': 'Previously owned, appears barely used with minimal signs of wear. Tested and fully functional. We warranty all items for 30 days.',
  'used_very_good': 'Previously used, shows light cosmetic wear from normal use. Tested and fully functional. We warranty all items for 30 days.',
  'used_good': 'Previously used, shows signs of wear or discoloration due to normal use. Tested and fully functional. We warranty all items for 30 days.',
  'used_fair': 'Previously used, shows moderate to heavy wear. May have cosmetic damage. Tested and fully functional. We warranty all items for 30 days.',
  'for_parts': 'Item sold as-is for parts or repair. Not tested or may not be fully functional. No warranty provided.'
};

export default function ProListingBuilder() {
  const [queue, setQueue] = useState([]);
  const [brandName, setBrandName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [userName, setUserName] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const fileInputRef = useRef(null);

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

          canvas.toBlob((blob) => {
            const compressedReader = new FileReader();
            compressedReader.readAsDataURL(blob);
            compressedReader.onloadend = () => {
              resolve(compressedReader.result.split(',')[1]);
            };
          }, 'image/jpeg', quality);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsProcessingImage(true);

    try {
      const base64Data = await compressImage(file);
      const response = await fetch('/api/process-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: base64Data, mimeType: 'image/jpeg' })
      });

      const data = await response.json();
      const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
      
      const brandMatch = text.match(/BRAND:\s*([^\|]+)/i);
      const partMatch = text.match(/PART:\s*(.+)/i);
      
      let brand = brandMatch?.[1]?.trim() || '';
      let part = partMatch?.[1]?.trim() || '';
      
      if (brand && part) {
        addToQueueWithValues(brand, part);
      } else {
        alert('Could not extract info. Please enter manually.');
        setBrandName(brand);
        setPartNumber(part);
      }
    } catch (error) {
      console.error('Image error:', error);
      alert('Error: ' + error.message);
    }
    
    setIsProcessingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addToQueueWithValues = (brand, part) => {
    if (!brand.trim() || !part.trim()) {
      alert('Enter brand and part number');
      return;
    }

    const newItem = {
      id: Date.now(),
      brand: brand.trim(),
      partNumber: part.trim(),
      status: 'pending',
      createdBy: userName || 'Unknown',
      title: '',
      description: '',
      specifications: [],
      condition: 'used_good',
      conditionNotes: CONDITION_NOTES['used_good'],
      price: '',
      shelf: '',
      boxLength: '',
      boxWidth: '',
      boxHeight: '',
      weight: '',
      error: null
    };

    setQueue(prev => [newItem, ...prev]);
    setBrandName('');
    setPartNumber('');
    setSelectedItem(newItem.id);
    
    // Pass the item directly to avoid state timing issues
    processItem(newItem);
  };

  const addToQueue = () => addToQueueWithValues(brandName, partNumber);

  const processItem = async (item) => {
    // Update status to searching
    setQueue(prev => prev.map(q => 
      q.id === item.id ? { ...q, status: 'searching' } : q
    ));

    try {
      const response = await fetch('/api/search-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: item.brand, partNumber: item.partNumber })
      });

      const data = await response.json();
      const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) throw new Error('No data');

      const product = JSON.parse(jsonMatch[0]);
      
      setQueue(prev => prev.map(q => 
        q.id === item.id ? {
          ...q,
          status: 'complete',
          title: product.title || `${item.brand} ${item.partNumber}`,
          description: product.description || '',
          specifications: Array.isArray(product.specifications) ? product.specifications : []
        } : q
      ));
    } catch (error) {
      console.error('Processing error:', error);
      setQueue(prev => prev.map(q => 
        q.id === item.id ? { ...q, status: 'error', error: error.message } : q
      ));
    }
  };

  const updateField = (itemId, field, value) => {
    setQueue(prev => prev.map(q => 
      q.id === itemId ? { ...q, [field]: value } : q
    ));
  };

  const updateCondition = (itemId, conditionValue) => {
    setQueue(prev => prev.map(q => 
      q.id === itemId ? { ...q, condition: conditionValue, conditionNotes: CONDITION_NOTES[conditionValue] } : q
    ));
  };

  const deleteItem = (itemId) => {
    setQueue(prev => prev.filter(q => q.id !== itemId));
    if (selectedItem === itemId) setSelectedItem(null);
  };

  const stats = {
    total: queue.length,
    complete: queue.filter(q => q.status === 'complete').length,
    searching: queue.filter(q => q.status === 'searching').length,
    error: queue.filter(q => q.status === 'error').length
  };

  if (!isNameSet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4">Pro Listing Builder</h1>
          <p className="text-gray-600 mb-6">Enter your name to begin</p>
          <input
            type="text"
            placeholder="Your Name"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && userName.trim() && setIsNameSet(true)}
            className="w-full px-4 py-3 border rounded-lg mb-4"
          />
          <button onClick={() => userName.trim() && setIsNameSet(true)} disabled={!userName.trim()} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            Start
          </button>
        </div>
      </div>
    );
  }

  const selected = queue.find(q => q.id === selectedItem);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">Pro Listing Builder</h1>
            <p className="text-sm text-gray-600">Logged in: <span className="font-semibold">{userName}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:flex lg:gap-4 gap-2">
          <div className="px-3 py-2 bg-blue-50 rounded-lg"><span className="text-xs text-blue-600">Total: </span><span className="font-bold text-blue-800">{stats.total}</span></div>
          <div className="px-3 py-2 bg-yellow-50 rounded-lg"><span className="text-xs text-yellow-600">Searching: </span><span className="font-bold text-yellow-800">{stats.searching}</span></div>
          <div className="px-3 py-2 bg-green-50 rounded-lg"><span className="text-xs text-green-600">Complete: </span><span className="font-bold text-green-800">{stats.complete}</span></div>
          <div className="px-3 py-2 bg-red-50 rounded-lg"><span className="text-xs text-red-600">Errors: </span><span className="font-bold text-red-800">{stats.error}</span></div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-180px)]">
        {/* LEFT PANEL - Queue */}
        <div className="w-full lg:w-80 bg-white border-b lg:border-r lg:border-b-0 overflow-y-auto max-h-[40vh] lg:max-h-none">
          <div className="p-4 border-b">
            <h2 className="font-semibold mb-3">Add Item</h2>
            
            <div className="flex gap-2 mb-2">
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" id="cam" />
              <label htmlFor="cam" className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer flex items-center justify-center gap-2 text-sm">
                <Camera className="w-4 h-4" />
                {isProcessingImage ? 'Processing...' : 'Camera'}
              </label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="upload" />
              <label htmlFor="upload" className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer flex items-center justify-center gap-2 text-sm">
                <Upload className="w-4 h-4" />
                Upload
              </label>
            </div>
            
            <input type="text" placeholder="Brand" value={brandName} onChange={e => setBrandName(e.target.value)} className="w-full px-3 py-2 border rounded-lg mb-2 text-sm" />
            <input type="text" placeholder="Part" value={partNumber} onChange={e => setPartNumber(e.target.value)} onKeyPress={e => e.key === 'Enter' && addToQueue()} className="w-full px-3 py-2 border rounded-lg mb-2 text-sm" />
            <button onClick={addToQueue} className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4 inline mr-1" />
              Add
            </button>
          </div>

          <div className="p-2">
            <h3 className="text-sm font-semibold text-gray-600 mb-2 px-2">Queue ({queue.length})</h3>
            {queue.map(item => (
              <div key={item.id} onClick={() => setSelectedItem(item.id)} className={`p-3 mb-2 rounded-lg border cursor-pointer ${selectedItem === item.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.status === 'searching' && <Loader className="w-5 h-5 text-blue-500 animate-spin" />}
                      {item.status === 'complete' && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {item.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                      <span className="text-sm font-semibold text-gray-800 truncate">{item.brand}</span>
                    </div>
                    <p className="text-xs text-gray-600 truncate">{item.partNumber}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} className="text-red-600 hover:bg-red-50 p-2 rounded ml-2">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER PANEL - Editor */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {selected ? (
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-4 lg:p-6">
              <div className="flex justify-between items-start mb-4 lg:mb-6">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold">{selected.brand} {selected.partNumber}</h2>
                  <p className="text-sm text-gray-500">Status: {selected.status}</p>
                </div>
              </div>

              {selected.status === 'complete' && (
                <div className="space-y-4 lg:space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Title ({selected.title.length}/80)</label>
                    <input type="text" value={selected.title} onChange={e => updateField(selected.id, 'title', e.target.value.slice(0, 80))} className="w-full px-3 py-2 border rounded-lg text-sm lg:text-base" maxLength={80} />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Description</label>
                    <textarea value={selected.description} onChange={e => updateField(selected.id, 'description', e.target.value)} className="w-full px-3 py-2 border rounded-lg h-32 text-sm lg:text-base" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Condition</label>
                    <select value={selected.condition} onChange={e => updateCondition(selected.id, e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm lg:text-base">
                      {CONDITION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <p className="text-xs text-gray-600 mt-2">{selected.conditionNotes}</p>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
                    <div><label className="block text-xs font-semibold mb-1">Length</label><input type="text" placeholder="in" value={selected.boxLength} onChange={e => updateField(selected.id, 'boxLength', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                    <div><label className="block text-xs font-semibold mb-1">Width</label><input type="text" placeholder="in" value={selected.boxWidth} onChange={e => updateField(selected.id, 'boxWidth', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                    <div><label className="block text-xs font-semibold mb-1">Height</label><input type="text" placeholder="in" value={selected.boxHeight} onChange={e => updateField(selected.id, 'boxHeight', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                    <div><label className="block text-xs font-semibold mb-1">Weight</label><input type="text" placeholder="lbs" value={selected.weight} onChange={e => updateField(selected.id, 'weight', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-semibold mb-2">Price ($)</label><input type="text" placeholder="0.00" value={selected.price} onChange={e => updateField(selected.id, 'price', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm lg:text-base" /></div>
                    <div><label className="block text-sm font-semibold mb-2">Shelf</label><input type="text" placeholder="A1" value={selected.shelf} onChange={e => updateField(selected.id, 'shelf', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm lg:text-base" /></div>
                  </div>

                  <button className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm lg:text-base">Send to SureDone</button>
                </div>
              )}

              {selected.status === 'searching' && (
                <div className="text-center py-12">
                  <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-500">AI searching for product information...</p>
                  <p className="text-xs text-gray-400 mt-2">This may take 10-30 seconds</p>
                </div>
              )}
              {selected.status === 'error' && (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600 font-semibold">Error</p>
                  <p className="text-sm text-red-500 mt-2">{selected.error}</p>
                  <button 
                    onClick={() => processItem(selected)} 
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 py-20">
              <div className="text-center"><Search className="w-16 h-16 mx-auto mb-4 opacity-50" /><p>Select an item to begin</p></div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL - Preview (Hidden on mobile) */}
        <div className="hidden lg:block w-80 bg-white border-l p-4">
          <h3 className="font-semibold mb-4">Preview</h3>
          {selected && selected.status === 'complete' ? (
            <div className="space-y-3 text-sm">
              <div className="border rounded p-2 bg-gray-50"><p className="font-semibold text-gray-700">Title</p><p className="text-gray-900">{selected.title || 'Generating...'}</p></div>
              <div className="border rounded p-2 bg-gray-50"><p className="font-semibold text-gray-700">Condition</p><p className="text-gray-900">{CONDITION_OPTIONS.find(c => c.value === selected.condition)?.label}</p></div>
              <div className="border rounded p-2 bg-gray-50"><p className="font-semibold text-gray-700">Price</p><p className="text-gray-900">{selected.price ? `$${selected.price}` : 'Not set'}</p></div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No preview</p>
          )}
        </div>
      </div>
    </div>
  );
}
