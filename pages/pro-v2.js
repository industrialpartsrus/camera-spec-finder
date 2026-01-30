// pages/pro-v2.js
// PRO LISTING BUILDER V2 - Clean Two-Pass Architecture
// Pass 1: AI Research → User confirms title/description
// Pass 2: Category selection → eBay item specifics → Submit to SureDone

import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy 
} from 'firebase/firestore';
import Head from 'next/head';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBMrZ7WJh5RNlEGE0PF0VmRJNnmvnAApBU",
  authDomain: "camera-spec-finder.firebaseapp.com",
  projectId: "camera-spec-finder",
  storageBucket: "camera-spec-finder.firebasestorage.app",
  messagingSenderId: "726012298498",
  appId: "1:726012298498:web:658b8138f964eed78ad033"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Condition options
const CONDITION_OPTIONS = [
  { key: 'new_in_box', label: 'New in Box', suredoneValue: 'New' },
  { key: 'new_open_box', label: 'New Other (Open Box)', suredoneValue: 'New Other' },
  { key: 'new_no_packaging', label: 'New not in Original Packaging', suredoneValue: 'New Other' },
  { key: 'new_missing_hardware', label: 'New - Missing Hardware', suredoneValue: 'New Other' },
  { key: 'refurbished', label: 'Manufacturer Refurbished', suredoneValue: 'Manufacturer Refurbished' },
  { key: 'used_excellent', label: 'Used - Excellent', suredoneValue: 'Used' },
  { key: 'used_good', label: 'Used - Good', suredoneValue: 'Used' },
  { key: 'used_fair', label: 'Used - Fair', suredoneValue: 'Used' },
  { key: 'for_parts', label: 'For Parts or Not Working', suredoneValue: 'For Parts or Not Working' }
];

// Shipping profiles
const SHIPPING_PROFILES = [
  { id: '69077991015', name: 'Standard Shipping' },
  { id: '241498022015', name: 'Heavy/Overweight' },
  { id: '253736784015', name: 'Freight' },
  { id: '161228820015', name: 'Local Pickup Only' }
];

export default function ProV2() {
  // Auth
  const [userName, setUserName] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);

  // Queue
  const [queue, setQueue] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  // New item form
  const [newBrand, setNewBrand] = useState('');
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newCondition, setNewCondition] = useState('used_good');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newBoxLength, setNewBoxLength] = useState('');
  const [newBoxWidth, setNewBoxWidth] = useState('');
  const [newBoxHeight, setNewBoxHeight] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newShelf, setNewShelf] = useState('');

  // Processing states
  const [isResearching, setIsResearching] = useState(false);
  const [isFetchingSpecifics, setIsFetchingSpecifics] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Duplicate warning
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Load queue from Firebase
  useEffect(() => {
    if (!isNameSet) return;

    const q = query(collection(db, 'products-v2'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQueue(items);
      
      // Update selected item if it changed
      if (selectedItem) {
        const updated = items.find(i => i.id === selectedItem.id);
        if (updated) setSelectedItem(updated);
      }
    });

    return () => unsubscribe();
  }, [isNameSet, selectedItem?.id]);

  // Check for duplicates
  const checkForDuplicates = async (partNumber) => {
    try {
      const response = await fetch('/api/check-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partNumber })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.exists) return data;
      }
    } catch (error) {
      console.error('Duplicate check error:', error);
    }
    return null;
  };

  // Add item to queue
  const addToQueue = async () => {
    if (!newBrand.trim() || !newPartNumber.trim()) {
      alert('Please enter Brand and Part Number');
      return;
    }

    const duplicate = await checkForDuplicates(newPartNumber);
    if (duplicate) {
      setDuplicateWarning({
        partNumber: newPartNumber,
        existingSku: duplicate.sku,
        existingData: duplicate.data
      });
      return;
    }

    const newItem = {
      brand: newBrand.trim(),
      partNumber: newPartNumber.trim().toUpperCase(),
      condition: newCondition,
      quantity: newQuantity || '1',
      boxLength: newBoxLength,
      boxWidth: newBoxWidth,
      boxHeight: newBoxHeight,
      weight: newWeight,
      shelfLocation: newShelf,
      status: 'pending',
      stage: 1,
      createdBy: userName,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'products-v2'), newItem);
      setNewBrand('');
      setNewPartNumber('');
      setNewCondition('used_good');
      setNewQuantity('1');
      setNewBoxLength('');
      setNewBoxWidth('');
      setNewBoxHeight('');
      setNewWeight('');
      setNewShelf('');
    } catch (error) {
      alert('Error adding item: ' + error.message);
    }
  };

  // PASS 1: Research product
  const researchProduct = async (itemId) => {
    const item = queue.find(q => q.id === itemId);
    if (!item) return;

    setIsResearching(true);
    
    try {
      await updateDoc(doc(db, 'products-v2', itemId), { status: 'researching', stage: 1 });

      const response = await fetch('/api/v2/research-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: item.brand,
          partNumber: item.partNumber,
          condition: item.condition
        })
      });

      if (!response.ok) throw new Error(`Research failed: ${response.status}`);

      const result = await response.json();

      if (result.success) {
        await updateDoc(doc(db, 'products-v2', itemId), {
          status: 'researched',
          stage: 2,
          productType: result.data.productType,
          title: result.data.title,
          description: result.data.description,
          shortDescription: result.data.shortDescription,
          manufacturer: result.data.manufacturer,
          model: result.data.model,
          series: result.data.series,
          researchedSpecs: result.data.specifications,
          confidence: result.data.confidence,
          conditionConfig: result.data.condition
        });
      } else {
        throw new Error(result.error || 'Research failed');
      }
    } catch (error) {
      console.error('Research error:', error);
      await updateDoc(doc(db, 'products-v2', itemId), { status: 'error', error: error.message });
    }

    setIsResearching(false);
  };

  // Confirm research and start Pass 2
  const confirmResearch = async (itemId) => {
    await updateDoc(doc(db, 'products-v2', itemId), {
      status: 'confirmed',
      stage: 3,
      confirmedBy: userName,
      confirmedAt: new Date().toISOString()
    });
    await fetchCategoryAndSpecifics(itemId);
  };

  // PASS 2: Get category and fill specifics
  const fetchCategoryAndSpecifics = async (itemId) => {
    const item = queue.find(q => q.id === itemId);
    if (!item) return;

    setIsFetchingSpecifics(true);

    try {
      // 2A: Get category and specifics structure
      const categoryResponse = await fetch('/api/v2/get-category-specifics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType: item.productType })
      });

      if (!categoryResponse.ok) throw new Error('Failed to get category');
      const categoryResult = await categoryResponse.json();
      if (!categoryResult.success) throw new Error(categoryResult.error);

      // 2B: Fill in values
      const fillResponse = await fetch('/api/v2/fill-specifics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: item.brand,
          partNumber: item.partNumber,
          productType: item.productType,
          itemSpecifics: categoryResult.data.itemSpecifics.all,
          knownSpecs: item.researchedSpecs || {}
        })
      });

      if (!fillResponse.ok) throw new Error('Failed to fill specifics');
      const fillResult = await fillResponse.json();

      await updateDoc(doc(db, 'products-v2', itemId), {
        status: 'specifics_loaded',
        stage: 4,
        ebayCategoryId: categoryResult.data.ebayCategory.id,
        ebayCategoryName: categoryResult.data.ebayCategory.name,
        ebayStoreCategoryId: categoryResult.data.ebayStoreCategory1,
        ebayStoreCategoryId2: categoryResult.data.ebayStoreCategory2,
        itemSpecificsForUI: fillResult.data.specificsForUI,
        itemSpecificsForSuredone: fillResult.data.specificsForSuredone,
        specificsFilledCount: fillResult.data.filledCount,
        specificsTotalCount: fillResult.data.totalCount
      });

    } catch (error) {
      console.error('Fetch specifics error:', error);
      await updateDoc(doc(db, 'products-v2', itemId), { status: 'error', error: error.message });
    }

    setIsFetchingSpecifics(false);
  };

  // Mark ready
  const markReady = async (itemId) => {
    await updateDoc(doc(db, 'products-v2', itemId), {
      status: 'ready',
      stage: 5,
      readyBy: userName,
      readyAt: new Date().toISOString()
    });
  };

  // Submit to SureDone
  const submitToSuredone = async (itemId) => {
    const item = queue.find(q => q.id === itemId);
    if (!item) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/v2/submit-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing: {
            brand: item.brand,
            partNumber: item.partNumber,
            title: item.title,
            description: item.description,
            shortDescription: item.shortDescription,
            manufacturer: item.manufacturer,
            model: item.model,
            productType: item.productType,
            condition: item.conditionConfig,
            quantity: item.quantity,
            price: item.price || '0.00',
            boxLength: item.boxLength,
            boxWidth: item.boxWidth,
            boxHeight: item.boxHeight,
            weight: item.weight,
            shelfLocation: item.shelfLocation,
            ebayCategoryId: item.ebayCategoryId,
            ebayStoreCategoryId: item.ebayStoreCategoryId,
            ebayStoreCategoryId2: item.ebayStoreCategoryId2,
            shippingProfileId: item.shippingProfileId || SHIPPING_PROFILES[0].id,
            itemSpecifics: item.itemSpecificsForSuredone
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        await updateDoc(doc(db, 'products-v2', itemId), {
          status: 'submitted',
          suredoneSku: result.sku,
          upc: result.upc,
          submittedBy: userName,
          submittedAt: new Date().toISOString()
        });
        alert(`✅ Success! SKU: ${result.sku}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    }

    setIsSubmitting(false);
  };

  // Update field
  const updateField = async (itemId, field, value) => {
    await updateDoc(doc(db, 'products-v2', itemId), { [field]: value });
  };

  // Update item specific
  const updateItemSpecific = async (itemId, fieldName, value) => {
    const item = queue.find(q => q.id === itemId);
    if (!item) return;

    const updatedForUI = (item.itemSpecificsForUI || []).map(spec =>
      spec.fieldName === fieldName ? { ...spec, value } : spec
    );
    const updatedForSuredone = { ...item.itemSpecificsForSuredone, [fieldName]: value };

    await updateDoc(doc(db, 'products-v2', itemId), {
      itemSpecificsForUI: updatedForUI,
      itemSpecificsForSuredone: updatedForSuredone
    });
  };

  // Delete item
  const deleteItem = async (itemId) => {
    if (confirm('Delete this item?')) {
      await deleteDoc(doc(db, 'products-v2', itemId));
      if (selectedItem?.id === itemId) setSelectedItem(null);
    }
  };

  // Login screen
  if (!isNameSet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-2">Pro Listing Builder V2 🚀</h1>
          <p className="text-gray-500 text-sm mb-6">Clean Two-Pass Architecture</p>
          <input
            type="text"
            placeholder="Enter your name"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && userName.trim() && setIsNameSet(true)}
            className="w-full px-4 py-3 border rounded-lg mb-4"
            autoFocus
          />
          <button
            onClick={() => userName.trim() && setIsNameSet(true)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  // Stats
  const stats = {
    total: queue.length,
    pending: queue.filter(q => q.stage === 1 && q.status !== 'researching').length,
    researched: queue.filter(q => q.stage === 2).length,
    ready: queue.filter(q => q.stage >= 4 && q.status !== 'submitted').length,
    submitted: queue.filter(q => q.status === 'submitted').length
  };

  return (
    <>
      <Head><title>Pro Listing Builder V2</title></Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Pro Listing Builder V2 🚀</h1>
              <p className="text-sm text-gray-500">Logged in: {userName}</p>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="px-3 py-1 bg-gray-100 rounded">Total: {stats.total}</span>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded">Pending: {stats.pending}</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded">Researched: {stats.researched}</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded">Ready: {stats.ready}</span>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded">Submitted: {stats.submitted}</span>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Left Panel */}
          <div className="w-80 bg-white border-r min-h-screen p-4">
            {/* Add Form */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Add New Item</h3>
              <input type="text" placeholder="Brand" value={newBrand} onChange={e => setNewBrand(e.target.value)} className="w-full px-3 py-2 border rounded mb-2" />
              <input type="text" placeholder="Part Number" value={newPartNumber} onChange={e => setNewPartNumber(e.target.value)} className="w-full px-3 py-2 border rounded mb-2" />
              <select value={newCondition} onChange={e => setNewCondition(e.target.value)} className="w-full px-3 py-2 border rounded mb-2">
                {CONDITION_OPTIONS.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input type="text" placeholder="Qty" value={newQuantity} onChange={e => setNewQuantity(e.target.value)} className="px-3 py-2 border rounded" />
                <input type="text" placeholder="Shelf" value={newShelf} onChange={e => setNewShelf(e.target.value)} className="px-3 py-2 border rounded" />
              </div>
              <div className="grid grid-cols-4 gap-1 mb-2">
                <input type="text" placeholder="L" value={newBoxLength} onChange={e => setNewBoxLength(e.target.value)} className="px-2 py-1 border rounded text-sm" />
                <input type="text" placeholder="W" value={newBoxWidth} onChange={e => setNewBoxWidth(e.target.value)} className="px-2 py-1 border rounded text-sm" />
                <input type="text" placeholder="H" value={newBoxHeight} onChange={e => setNewBoxHeight(e.target.value)} className="px-2 py-1 border rounded text-sm" />
                <input type="text" placeholder="Wt" value={newWeight} onChange={e => setNewWeight(e.target.value)} className="px-2 py-1 border rounded text-sm" />
              </div>
              <button onClick={addToQueue} className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700">+ Add to Queue</button>
            </div>

            {/* Queue */}
            <div>
              <h3 className="font-semibold mb-3">Queue ({queue.length})</h3>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {queue.map(item => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-3 rounded-lg cursor-pointer border ${selectedItem?.id === item.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium text-sm">{item.brand}</p>
                        <p className="text-xs text-gray-600">{item.partNumber}</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteItem(item.id); }} className="text-gray-400 hover:text-red-500">×</button>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${
                      item.status === 'submitted' ? 'bg-purple-100 text-purple-700' :
                      item.status === 'ready' ? 'bg-green-100 text-green-700' :
                      item.stage >= 4 ? 'bg-teal-100 text-teal-700' :
                      item.status === 'researched' ? 'bg-blue-100 text-blue-700' :
                      item.status === 'researching' ? 'bg-yellow-100 text-yellow-700' :
                      item.status === 'error' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {item.status || 'pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Panel */}
          <div className="flex-1 p-6">
            {selectedItem ? (
              <ItemPanel
                item={selectedItem}
                onResearch={researchProduct}
                onConfirm={confirmResearch}
                onMarkReady={markReady}
                onSubmit={submitToSuredone}
                onUpdateField={updateField}
                onUpdateItemSpecific={updateItemSpecific}
                isResearching={isResearching}
                isFetchingSpecifics={isFetchingSpecifics}
                isSubmitting={isSubmitting}
              />
            ) : (
              <div className="flex items-center justify-center h-96 text-gray-400">
                Select an item from the queue
              </div>
            )}
          </div>
        </div>

        {/* Duplicate Modal */}
        {duplicateWarning && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-red-600 mb-2">⚠️ Duplicate Found!</h3>
              <p className="mb-4">Part number <strong>{duplicateWarning.partNumber}</strong> exists.</p>
              <p className="text-sm text-gray-600 mb-4">SKU: <strong>{duplicateWarning.existingSku}</strong></p>
              <div className="flex gap-2">
                <button onClick={() => setDuplicateWarning(null)} className="flex-1 px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                <button onClick={() => setDuplicateWarning(null)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Edit Existing</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Item Panel Component
function ItemPanel({ item, onResearch, onConfirm, onMarkReady, onSubmit, onUpdateField, onUpdateItemSpecific, isResearching, isFetchingSpecifics, isSubmitting }) {
  const stage = item.stage || 1;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{item.brand} {item.partNumber}</h2>
          <p className="text-gray-500">Stage {stage} • {item.status}</p>
        </div>
        {item.suredoneSku && (
          <div className="text-right">
            <p className="text-sm text-gray-500">SKU</p>
            <p className="font-mono font-bold text-green-600">{item.suredoneSku}</p>
          </div>
        )}
      </div>

      {/* Stage 1: Research */}
      {stage === 1 && item.status !== 'researching' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Step 1: Research Product</h3>
          <p className="text-yellow-700 mb-4">AI will research and generate title/description.</p>
          <button onClick={() => onResearch(item.id)} disabled={isResearching} className="bg-yellow-600 text-white px-6 py-2 rounded font-medium hover:bg-yellow-700 disabled:opacity-50">
            {isResearching ? '🔍 Researching...' : '🔍 Research Product'}
          </button>
        </div>
      )}

      {item.status === 'researching' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <p className="text-blue-700">Researching...</p>
          </div>
        </div>
      )}

      {/* Stage 2+: Show research results */}
      {stage >= 2 && (
        <div className="space-y-6">
          {/* Product Type */}
          <div className="bg-white rounded-lg border p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
            <p className="text-lg font-semibold text-blue-600">{item.productType}</p>
            {item.confidence && (
              <span className={`text-xs px-2 py-0.5 rounded ${item.confidence === 'HIGH' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {item.confidence} confidence
              </span>
            )}
          </div>

          {/* Title */}
          <div className="bg-white rounded-lg border p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title ({item.title?.length || 0}/80)</label>
            <input type="text" value={item.title || ''} onChange={e => onUpdateField(item.id, 'title', e.target.value)} maxLength={80} className="w-full px-3 py-2 border rounded" />
          </div>

          {/* Description */}
          <div className="bg-white rounded-lg border p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={item.description || ''} onChange={e => onUpdateField(item.id, 'description', e.target.value)} rows={6} className="w-full px-3 py-2 border rounded font-mono text-sm" />
          </div>

          {/* Confirm (Stage 2) */}
          {stage === 2 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700 mb-3">Review above. Click Confirm to load eBay item specifics.</p>
              <div className="flex gap-3">
                <button onClick={() => onConfirm(item.id)} disabled={isFetchingSpecifics} className="bg-green-600 text-white px-6 py-2 rounded font-medium hover:bg-green-700 disabled:opacity-50">
                  {isFetchingSpecifics ? '⏳ Loading...' : '✓ Confirm & Load Specifics'}
                </button>
                <button onClick={() => onResearch(item.id)} disabled={isResearching} className="border px-4 py-2 rounded hover:bg-gray-50">🔄 Research Again</button>
              </div>
            </div>
          )}

          {/* Stage 4+: Categories & Item Specifics */}
          {stage >= 4 && (
            <>
              {/* Categories */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-3">📦 eBay Categories</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500">Product Category</label>
                    <p className="font-medium">{item.ebayCategoryName}</p>
                    <p className="text-xs text-gray-400">ID: {item.ebayCategoryId}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500">Store Category 1</label>
                    <p className="text-sm">{item.ebayStoreCategoryId}</p>
                  </div>
                </div>
              </div>

              {/* Item Specifics */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex justify-between mb-4">
                  <h3 className="font-semibold">📋 eBay Item Specifics</h3>
                  <span className="text-sm text-gray-500">{item.specificsFilledCount || 0} of {item.specificsTotalCount || 0} filled</span>
                </div>
                <div className="grid grid-cols-2 gap-4 max-h-80 overflow-y-auto">
                  {(item.itemSpecificsForUI || []).map((spec, idx) => (
                    <div key={idx}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {spec.name} {spec.required && <span className="text-red-500">*</span>}
                      </label>
                      {spec.allowedValues?.length > 0 ? (
                        <select value={spec.value || ''} onChange={e => onUpdateItemSpecific(item.id, spec.fieldName, e.target.value)} className="w-full px-3 py-2 border rounded text-sm">
                          <option value="">Select...</option>
                          {spec.allowedValues.map((v, i) => <option key={i} value={v}>{v}</option>)}
                        </select>
                      ) : (
                        <input type="text" value={spec.value || ''} onChange={e => onUpdateItemSpecific(item.id, spec.fieldName, e.target.value)} className="w-full px-3 py-2 border rounded text-sm" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {item.status !== 'submitted' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  {item.status === 'ready' ? (
                    <>
                      <p className="text-blue-700 mb-3">✅ Ready! Submit to SureDone.</p>
                      <button onClick={() => onSubmit(item.id)} disabled={isSubmitting} className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50">
                        {isSubmitting ? '📤 Submitting...' : '📤 Submit to SureDone'}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-blue-700 mb-3">Review specifics, then mark ready.</p>
                      <button onClick={() => onMarkReady(item.id)} className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700">✓ Mark Ready</button>
                    </>
                  )}
                </div>
              )}

              {/* Success */}
              {item.status === 'submitted' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-800 mb-2">🎉 Submitted!</h3>
                  <p>SKU: <strong>{item.suredoneSku}</strong></p>
                  {item.upc && <p>UPC: {item.upc}</p>}
                </div>
              )}
            </>
          )}

          {/* Shipping Info */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3">📦 Shipping & Location</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Condition</label>
                <p className="text-sm">{CONDITION_OPTIONS.find(c => c.key === item.condition)?.label}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Qty</label>
                <input type="text" value={item.quantity || '1'} onChange={e => onUpdateField(item.id, 'quantity', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Shelf</label>
                <input type="text" value={item.shelfLocation || ''} onChange={e => onUpdateField(item.id, 'shelfLocation', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Weight</label>
                <input type="text" value={item.weight || ''} onChange={e => onUpdateField(item.id, 'weight', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
              </div>
            </div>
          </div>

          {/* Error */}
          {item.status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-2">❌ Error</h3>
              <p className="text-red-700 text-sm">{item.error}</p>
              <button onClick={() => onResearch(item.id)} className="mt-3 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">🔄 Try Again</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
