import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Trash2, CheckCircle, Loader, AlertCircle, X, Camera, Upload, User, Edit2, RefreshCw } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

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
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);

  // Real-time Firebase sync
  useEffect(() => {
    if (!isNameSet) return;

    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setQueue(items);
    });

    return () => unsubscribe();
  }, [isNameSet]);

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

  const addToQueueWithValues = async (brand, part) => {
    if (!brand.trim() || !part.trim()) {
      alert('Enter brand and part number');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'products'), {
        brand: brand.trim(),
        partNumber: part.trim(),
        status: 'pending',
        createdBy: userName || 'Unknown',
        createdAt: serverTimestamp(),
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
        weight: ''
      });

      setBrandName('');
      setPartNumber('');
      setSelectedItem(docRef.id);
      
      // Start processing - pass the data we already have
      setTimeout(() => processItemById(docRef.id, brand.trim(), part.trim()), 1000);
    } catch (error) {
      console.error('Error adding to queue:', error);
      alert('Error adding item: ' + error.message);
    }
  };

  const addToQueue = () => addToQueueWithValues(brandName, partNumber);

  const processItemById = async (itemId, brandOverride, partOverride) => {
    // Try to find in queue first, or use override values
    let item = queue.find(q => q.id === itemId);
    
    if (!item && brandOverride && partOverride) {
      // Use the values we passed in if item not in queue yet
      item = { id: itemId, brand: brandOverride, partNumber: partOverride };
    }
    
    if (!item) {
      console.error('Item not found:', itemId);
      return;
    }

    console.log('Starting to process item:', item.brand, item.partNumber);
    
    try {
      await updateDoc(doc(db, 'products', itemId), { status: 'searching' });

      console.log('Calling /api/search-product...');
      
      const response = await fetch('/api/search-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: item.brand, partNumber: item.partNumber })
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data received, length:', JSON.stringify(data).length);
      
      const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
      console.log('Extracted text length:', text.length);
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        console.error('No JSON found in response. Text preview:', text.substring(0, 200));
        throw new Error('No product data found in AI response');
      }

      console.log('JSON matched, parsing...');
      const product = JSON.parse(jsonMatch[0]);
      console.log('Product parsed successfully:', product.title);
      
      await updateDoc(doc(db, 'products', itemId), {
        status: 'complete',
        title: product.title || `${item.brand} ${item.partNumber}`,
        description: product.description || '',
        specifications: Array.isArray(product.specifications) ? product.specifications : []
      });
      
      console.log('Item processing complete!');
    } catch (error) {
      console.error('Processing error:', error);
      await updateDoc(doc(db, 'products', itemId), {
        status: 'error',
        error: error.message
      });
    }
  };

  const processItem = (itemId) => {
    const item = queue.find(q => q.id === itemId);
    if (item) {
      processItemById(itemId, item.brand, item.partNumber);
    }
  };

  const updateField = async (itemId, field, value) => {
    try {
      await updateDoc(doc(db, 'products', itemId), { [field]: value });
    } catch (error) {
      console.error('Error updating field:', error);
    }
  };

  const updateCondition = async (itemId, conditionValue) => {
    try {
      await updateDoc(doc(db, 'products', itemId), {
        condition: conditionValue,
        conditionNotes: CONDITION_NOTES[conditionValue]
      });
    } catch (error) {
      console.error('Error updating condition:', error);
    }
  };

  const deleteItem = async (itemId) => {
    try {
      await deleteDoc(doc(db, 'products', itemId));
      if (selectedItem === itemId) setSelectedItem(null);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const sendToSureDone = async (itemId) => {
    const item = queue.find(q => q.id === itemId);
    
    if (!item) {
      alert('❌ Item not found in queue');
      return;
    }
    
    if (!item.title || !item.price) {
      alert('⚠️ Please fill in Title and Price before sending to SureDone');
      return;
    }

    setIsSending(true);
    
    try {
      console.log('Sending to SureDone:', item);
      
      // Get the condition label for the condition field
      const conditionOption = CONDITION_OPTIONS.find(c => c.value === item.condition);
      const conditionLabel = conditionOption?.label || 'Used - Good (GOOD)';
      
      const response = await fetch('/api/suredone-create-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            title: item.title,
            description: item.description || '',
            price: item.price || '0.00',
            stock: 1,
            brand: item.brand,
            partNumber: item.partNumber,
            
            // Condition information
            condition: conditionLabel,
            conditionNotes: item.conditionNotes || CONDITION_NOTES[item.condition] || '',
            
            // Dimensions and weight
            boxLength: item.boxLength || '',
            boxWidth: item.boxWidth || '',
            boxHeight: item.boxHeight || '',
            weight: item.weight || '',
            
            // Shelf location as custom field
            shelfLocation: item.shelf || '',
            
            // Meta information
            metaDescription: item.shortDescription || item.description?.substring(0, 160) || '',
            metaKeywords: Array.isArray(item.metaKeywords) ? item.metaKeywords.join(', ') : '',
            
            // eBay category (will be auto-filled later)
            ebayCategory: item.ebayCategory || '',
            
            // Specifications
            specifications: Array.isArray(item.specifications) ? item.specifications : []
          }
        })
      });

      console.log('SureDone response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create listing');
      }

      const data = await response.json();
      console.log('SureDone success:', data);
      
      alert('✅ Successfully sent to SureDone!\n\nSKU: ' + (data.sku || 'Generated') + '\n\n' + item.title);
      
    } catch (error) {
      console.error('SureDone error:', error);
      alert('❌ Error sending to SureDone:\n\n' + error.message);
    }
    
    setIsSending(false);
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
            <h1 className="text-2xl font-bold">Pro Listing Builder 🔥</h1>
            <p className="text-sm text-gray-600">Logged in: <span className="font-semibold">{userName}</span> • <span className="text-green-600">● Live Sync</span></p>
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

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {selected ? (
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-4 lg:p-6">
              <div className="flex justify-between items-start mb-4 lg:mb-6">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold">{selected.brand} {selected.partNumber}</h2>
                  <p className="text-sm text-gray-500">Status: {selected.status} • By: {selected.createdBy}</p>
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

                  <button 
                    onClick={() => sendToSureDone(selected.id)} 
                    disabled={isSending || !selected.title || !selected.price}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSending ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send to SureDone'
                    )}
                  </button>
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
                    onClick={() => processItem(selected.id)} 
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
