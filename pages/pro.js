// pages/pro.js
// Updated Pro Listing Builder with structured specifications

import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Trash2, CheckCircle, Loader, AlertCircle, X, Camera, Upload, User, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

// Import category config for display
const CATEGORY_OPTIONS = [
  'Electric Motors',
  'Servo Motors', 
  'Servo Drives',
  'VFDs',
  'PLCs',
  'HMIs',
  'Proximity Sensors',
  'Photoelectric Sensors',
  'Light Curtains',
  'Pneumatic Cylinders',
  'Pneumatic Valves',
  'Hydraulic Pumps',
  'Hydraulic Valves',
  'Circuit Breakers',
  'Contactors',
  'Safety Relays',
  'Bearings'
];

const CONDITION_OPTIONS = [
  { value: 'new_in_box', label: 'New In Box (NIB)' },
  { value: 'new_open_box', label: 'New - Open Box' },
  { value: 'new_missing_hardware', label: 'New - Missing Hardware' },
  { value: 'like_new_excellent', label: 'Excellent - Barely Used' },
  { value: 'used_very_good', label: 'Used - Very Good' },
  { value: 'used_good', label: 'Used - Good' },
  { value: 'used_fair', label: 'Used - Fair' },
  { value: 'for_parts', label: 'For Parts or Not Working' }
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

// Friendly labels for specification fields
const SPEC_LABELS = {
  voltage: 'Voltage',
  amperage: 'Amperage',
  horsepower: 'Horsepower',
  rpm: 'RPM',
  frame_size: 'Frame Size',
  nema_frame_suffix: 'NEMA Frame Suffix',
  nema_design: 'NEMA Design',
  service_factor: 'Service Factor',
  phase: 'Phase',
  frequency: 'Frequency',
  enclosure: 'Enclosure Type',
  insulation_class: 'Insulation Class',
  motor_type: 'Motor Type',
  sensing_range: 'Sensing Range',
  output_type: 'Output Type',
  bore_diameter: 'Bore Diameter',
  stroke_length: 'Stroke Length',
  port_size: 'Port Size',
  max_pressure: 'Max Pressure',
  coil_voltage: 'Coil Voltage',
  contact_rating: 'Contact Rating',
  number_of_poles: 'Number of Poles',
  communication_protocol: 'Communication Protocol',
  input_voltage: 'Input Voltage',
  output_voltage: 'Output Voltage',
  kw_rating: 'kW Rating',
  ip_rating: 'IP Rating',
  mounting_type: 'Mounting Type',
  weight: 'Weight'
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
  const [showSpecs, setShowSpecs] = useState(true);
  const fileInputRef = useRef(null);

  // Real-time Firebase sync
  useEffect(() => {
    if (!isNameSet) return;
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
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
            compressedReader.onloadend = () => resolve(compressedReader.result.split(',')[1]);
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

  // Generate keywords from product data
  const generateKeywords = (item) => {
    const keywords = new Set();
    
    // Add brand and part number
    if (item.brand) keywords.add(item.brand.toLowerCase());
    if (item.partNumber) keywords.add(item.partNumber.toLowerCase());
    
    // Add category-based keywords
    if (item.productCategory) {
      keywords.add(item.productCategory.toLowerCase());
      // Add variations
      if (item.productCategory === 'Electric Motors') {
        keywords.add('motor');
        keywords.add('electric motor');
        keywords.add('industrial motor');
      } else if (item.productCategory === 'VFDs') {
        keywords.add('vfd');
        keywords.add('variable frequency drive');
        keywords.add('ac drive');
      } else if (item.productCategory === 'PLCs') {
        keywords.add('plc');
        keywords.add('programmable logic controller');
      }
    }
    
    // Add spec-based keywords
    if (item.specifications) {
      if (item.specifications.horsepower) keywords.add(item.specifications.horsepower.toLowerCase());
      if (item.specifications.voltage) keywords.add(item.specifications.voltage.toLowerCase());
      if (item.specifications.phase) keywords.add(item.specifications.phase.toLowerCase());
      if (item.specifications.frame_size) keywords.add(item.specifications.frame_size.toLowerCase());
    }
    
    return Array.from(keywords).join(', ');
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
        productCategory: '',
        shortDescription: '',
        description: '',
        specifications: {},
        rawSpecifications: [],
        condition: 'used_good',
        conditionNotes: CONDITION_NOTES['used_good'],
        price: '',
        shelf: '',
        boxLength: '',
        boxWidth: '',
        boxHeight: '',
        weight: '',
        qualityFlag: '',
        ebayCategoryId: '',
        ebayStoreCategoryId: '',
        bigcommerceCategoryId: ''
      });
      setBrandName('');
      setPartNumber('');
      setSelectedItem(docRef.id);
      setTimeout(() => processItemById(docRef.id, brand.trim(), part.trim()), 1000);
    } catch (error) {
      console.error('Error adding to queue:', error);
      alert('Error adding item: ' + error.message);
    }
  };

  const addToQueue = () => addToQueueWithValues(brandName, partNumber);

  const processItemById = async (itemId, brandOverride, partOverride) => {
    let item = queue.find(q => q.id === itemId);
    if (!item && brandOverride && partOverride) {
      item = { id: itemId, brand: brandOverride, partNumber: partOverride };
    }
    if (!item) return;

    try {
      await updateDoc(doc(db, 'products', itemId), { status: 'searching' });
      
      const response = await fetch('/api/search-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: item.brand, partNumber: item.partNumber })
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const data = await response.json();
      const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) throw new Error('No product data found');

      const product = JSON.parse(jsonMatch[0]);
      
      await updateDoc(doc(db, 'products', itemId), {
        status: 'complete',
        title: product.title || `${item.brand} ${item.partNumber}`,
        productCategory: product.productCategory || '',
        shortDescription: product.shortDescription || '',
        description: product.description || '',
        specifications: product.specifications || {},
        rawSpecifications: product.rawSpecifications || [],
        qualityFlag: product.qualityFlag || 'NEEDS_REVIEW',
        ebayCategoryId: product.ebayCategoryId || '',
        ebayStoreCategoryId: product.ebayStoreCategoryId || '',
        bigcommerceCategoryId: product.bigcommerceCategoryId || ''
      });
      
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
    if (item) processItemById(itemId, item.brand, item.partNumber);
  };

  const updateField = async (itemId, field, value) => {
    try {
      await updateDoc(doc(db, 'products', itemId), { [field]: value });
    } catch (error) {
      console.error('Error updating field:', error);
    }
  };

  const updateSpecification = async (itemId, specKey, value) => {
    const item = queue.find(q => q.id === itemId);
    if (!item) return;
    const newSpecs = { ...item.specifications, [specKey]: value };
    await updateDoc(doc(db, 'products', itemId), { specifications: newSpecs });
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
    if (!item) return alert('Item not found');
    if (!item.title || !item.price) return alert('Please fill in Title and Price');

    setIsSending(true);
    try {
      const conditionOption = CONDITION_OPTIONS.find(c => c.value === item.condition);
      
      // Generate keywords from the item data
      const keywords = generateKeywords(item);
      
      const productData = {
        // Core fields
        title: item.title,
        description: item.description || '',
        shortDescription: item.shortDescription || '',
        price: item.price || '0.00',
        stock: 1,
        brand: item.brand,
        partNumber: item.partNumber,
        
        // Category
        productCategory: item.productCategory || '',
        
        // Condition
        condition: conditionOption?.label || 'Used - Good',
        conditionNotes: item.conditionNotes || '',
        
        // Specifications - structured object
        specifications: item.specifications || {},
        
        // Raw specs for custom fields
        rawSpecifications: item.rawSpecifications || [],
        
        // Meta/SEO fields
        metaDescription: item.shortDescription || '',
        metaKeywords: keywords,
        
        // Dimensions (only if provided)
        ...(item.boxLength && { boxLength: item.boxLength }),
        ...(item.boxWidth && { boxWidth: item.boxWidth }),
        ...(item.boxHeight && { boxHeight: item.boxHeight }),
        ...(item.weight && { weight: item.weight }),
        
        // Shelf location
        ...(item.shelf && { shelfLocation: item.shelf }),
        
        // Category IDs
        ebayCategoryId: item.ebayCategoryId || '',
        ebayStoreCategoryId: item.ebayStoreCategoryId || '',
        bigcommerceCategoryId: item.bigcommerceCategoryId || ''
      };
      
      console.log('Sending to SureDone:', productData);
      
      const response = await fetch('/api/suredone-create-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: productData })
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create listing');
      }

      alert(`✅ Successfully sent to SureDone!\n\nSKU: ${responseData.sku}\n\n${item.title}`);
      
    } catch (error) {
      console.error('SureDone error:', error);
      alert(`❌ Error: ${error.message}`);
    }
    setIsSending(false);
  };

  const stats = {
    total: queue.length,
    complete: queue.filter(q => q.status === 'complete').length,
    searching: queue.filter(q => q.status === 'searching').length,
    error: queue.filter(q => q.status === 'error').length
  };

  // Login screen
  if (!isNameSet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
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
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">Pro Listing Builder 🚀</h1>
            <p className="text-sm text-gray-600">
              Logged in: <span className="font-semibold">{userName}</span> • 
              <span className="text-green-600 ml-2">● Live Sync</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="px-3 py-2 bg-blue-50 rounded-lg text-sm">Total: <span className="font-bold text-blue-800">{stats.total}</span></div>
          <div className="px-3 py-2 bg-yellow-50 rounded-lg text-sm">Searching: <span className="font-bold text-yellow-800">{stats.searching}</span></div>
          <div className="px-3 py-2 bg-green-50 rounded-lg text-sm">Complete: <span className="font-bold text-green-800">{stats.complete}</span></div>
          <div className="px-3 py-2 bg-red-50 rounded-lg text-sm">Errors: <span className="font-bold text-red-800">{stats.error}</span></div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-140px)]">
        {/* Sidebar */}
        <div className="w-full lg:w-80 bg-white border-b lg:border-r lg:border-b-0 overflow-y-auto max-h-[40vh] lg:max-h-none">
          <div className="p-4 border-b">
            <h2 className="font-semibold mb-3">Add Item</h2>
            <div className="flex gap-2 mb-2">
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" id="cam" />
              <label htmlFor="cam" className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer flex items-center justify-center gap-2 text-sm">
                <Camera className="w-4 h-4" />
                {isProcessingImage ? '...' : 'Camera'}
              </label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="upload" />
              <label htmlFor="upload" className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer flex items-center justify-center gap-2 text-sm">
                <Upload className="w-4 h-4" />
                Upload
              </label>
            </div>
            <input type="text" placeholder="Brand" value={brandName} onChange={e => setBrandName(e.target.value)} className="w-full px-3 py-2 border rounded-lg mb-2 text-sm" />
            <input type="text" placeholder="Part Number" value={partNumber} onChange={e => setPartNumber(e.target.value)} onKeyPress={e => e.key === 'Enter' && addToQueue()} className="w-full px-3 py-2 border rounded-lg mb-2 text-sm" />
            <button onClick={addToQueue} className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4 inline mr-1" /> Add
            </button>
          </div>

          <div className="p-2">
            <h3 className="text-sm font-semibold text-gray-600 mb-2 px-2">Queue ({queue.length})</h3>
            {queue.map(item => (
              <div key={item.id} onClick={() => setSelectedItem(item.id)} className={`p-3 mb-2 rounded-lg border cursor-pointer transition ${selectedItem === item.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.status === 'searching' && <Loader className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />}
                      {item.status === 'complete' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                      {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      <span className="text-sm font-semibold text-gray-800 truncate">{item.brand}</span>
                    </div>
                    <p className="text-xs text-gray-600 truncate">{item.partNumber}</p>
                    {item.productCategory && (
                      <p className="text-xs text-blue-600 mt-1">{item.productCategory}</p>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} className="text-red-600 hover:bg-red-50 p-1 rounded ml-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {selected ? (
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selected.brand} {selected.partNumber}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm px-2 py-1 rounded ${selected.status === 'complete' ? 'bg-green-100 text-green-700' : selected.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {selected.status}
                    </span>
                    {selected.qualityFlag && (
                      <span className={`text-sm px-2 py-1 rounded ${selected.qualityFlag === 'STRONG' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {selected.qualityFlag}
                      </span>
                    )}
                    {selected.productCategory && (
                      <span className="text-sm px-2 py-1 rounded bg-blue-100 text-blue-700">
                        {selected.productCategory}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => processItem(selected.id)} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm flex items-center gap-1">
                  <RefreshCw className="w-4 h-4" /> Re-search
                </button>
              </div>

              {selected.status === 'complete' && (
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Title ({selected.title?.length || 0}/80)</label>
                    <input type="text" value={selected.title || ''} onChange={e => updateField(selected.id, 'title', e.target.value.slice(0, 80))} className="w-full px-3 py-2 border rounded-lg" maxLength={80} />
                  </div>

                  {/* Category Override */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Product Category</label>
                    <select value={selected.productCategory || ''} onChange={e => updateField(selected.id, 'productCategory', e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select category...</option>
                      {CATEGORY_OPTIONS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>

                  {/* Structured Specifications */}
                  <div className="border rounded-lg overflow-hidden">
                    <button 
                      onClick={() => setShowSpecs(!showSpecs)}
                      className="w-full px-4 py-3 bg-blue-50 flex justify-between items-center hover:bg-blue-100 transition"
                    >
                      <span className="font-semibold text-blue-800">📋 Specifications ({Object.keys(selected.specifications || {}).length} fields)</span>
                      {showSpecs ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    
                    {showSpecs && selected.specifications && Object.keys(selected.specifications).length > 0 && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(selected.specifications).map(([key, value]) => (
                          <div key={key} className="flex flex-col">
                            <label className="text-xs font-medium text-gray-600 mb-1">
                              {SPEC_LABELS[key] || key}
                            </label>
                            <input
                              type="text"
                              value={value || ''}
                              onChange={e => updateSpecification(selected.id, key, e.target.value)}
                              className="px-3 py-2 border rounded-lg text-sm"
                              placeholder={`Enter ${SPEC_LABELS[key] || key}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {showSpecs && (!selected.specifications || Object.keys(selected.specifications).length === 0) && (
                      <div className="p-4 text-gray-500 text-sm">No specifications found</div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Description</label>
                    <textarea 
                      value={selected.description || ''} 
                      onChange={e => updateField(selected.id, 'description', e.target.value)} 
                      className="w-full px-3 py-2 border rounded-lg h-40 font-mono text-sm" 
                    />
                    {selected.description?.includes('<') && (
                      <div className="mt-2 p-3 bg-gray-50 border rounded-lg">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Preview:</p>
                        <div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selected.description }} />
                      </div>
                    )}
                  </div>

                  {/* Short Description / Meta */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Short Description / Meta ({selected.shortDescription?.length || 0}/160)</label>
                    <textarea 
                      value={selected.shortDescription || ''} 
                      onChange={e => updateField(selected.id, 'shortDescription', e.target.value.slice(0, 160))} 
                      className="w-full px-3 py-2 border rounded-lg h-20 text-sm" 
                      maxLength={160}
                    />
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Condition</label>
                    <select value={selected.condition || 'used_good'} onChange={e => updateCondition(selected.id, e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                      {CONDITION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">{selected.conditionNotes}</p>
                  </div>

                  {/* Dimensions */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Length (in)</label>
                      <input type="text" value={selected.boxLength || ''} onChange={e => updateField(selected.id, 'boxLength', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Width (in)</label>
                      <input type="text" value={selected.boxWidth || ''} onChange={e => updateField(selected.id, 'boxWidth', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Height (in)</label>
                      <input type="text" value={selected.boxHeight || ''} onChange={e => updateField(selected.id, 'boxHeight', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Weight (lbs)</label>
                      <input type="text" value={selected.weight || ''} onChange={e => updateField(selected.id, 'weight', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>

                  {/* Price & Shelf */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Price ($) *</label>
                      <input type="text" placeholder="0.00" value={selected.price || ''} onChange={e => updateField(selected.id, 'price', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Shelf Location</label>
                      <input type="text" placeholder="A1" value={selected.shelf || ''} onChange={e => updateField(selected.id, 'shelf', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>

                  {/* Send Button */}
                  <button 
                    onClick={() => sendToSureDone(selected.id)} 
                    disabled={isSending || !selected.title || !selected.price}
                    className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSending ? (
                      <><Loader className="w-5 h-5 animate-spin" /> Sending...</>
                    ) : (
                      '🚀 Send to SureDone'
                    )}
                  </button>
                </div>
              )}

              {selected.status === 'searching' && (
                <div className="text-center py-16">
                  <Loader className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">AI is searching for product specifications...</p>
                  <p className="text-gray-400 text-sm mt-2">This may take 15-30 seconds</p>
                </div>
              )}

              {selected.status === 'error' && (
                <div className="text-center py-16">
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600 font-semibold text-lg">Error Processing Item</p>
                  <p className="text-red-500 mt-2">{selected.error}</p>
                  <button onClick={() => processItem(selected.id)} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    🔄 Retry
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 py-20">
              <div className="text-center">
                <Search className="w-20 h-20 mx-auto mb-4 opacity-30" />
                <p className="text-xl">Select an item to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
