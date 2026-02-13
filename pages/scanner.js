// pages/scanner.js
// Mobile-first warehouse inventory scanner
// Fast, one-handed operation with big touch targets

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Edit3, LogOut, Plus, Minus, Check, X, AlertTriangle, Package, RefreshCw } from 'lucide-react';
import { verifyUser, getActiveUsers } from '../lib/auth';

const CONDITION_OPTIONS = [
  { value: 'New', label: 'New', color: 'bg-green-100 border-green-500 text-green-900' },
  { value: 'New Other (see details)', label: 'New in Box', color: 'bg-green-100 border-green-500 text-green-900' },
  { value: 'New (Other)', label: 'New Surplus', color: 'bg-blue-100 border-blue-500 text-blue-900' },
  { value: 'Open Box (Never Used)', label: 'Open Box', color: 'bg-blue-100 border-blue-500 text-blue-900' },
  { value: 'Used', label: 'Used', color: 'bg-yellow-100 border-yellow-500 text-yellow-900' },
  { value: 'For parts or not working', label: 'For Parts', color: 'bg-red-100 border-red-500 text-red-900' }
];

export default function WarehouseScanner() {
  // Auth state
  const [screen, setScreen] = useState('login'); // login, scan, results, add-stock, new-item, success
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [pinInput, setPinInput] = useState('');

  // Scan state
  const [brand, setBrand] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const fileInputRef = useRef(null);

  // Results state
  const [matches, setMatches] = useState([]);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Add stock state
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const [newShelf, setNewShelf] = useState('');

  // New item state
  const [newSku, setNewSku] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);
  const [newItemShelf, setNewItemShelf] = useState('');

  // Success state
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
    const storedUsername = localStorage.getItem('scanner_user');
    if (storedUsername) {
      const activeUsers = await getActiveUsers();
      const user = activeUsers.find(u => u.username === storedUsername);
      if (user) {
        setCurrentUser(user);
        setScreen('scan');
      } else {
        // User no longer active, clear storage
        localStorage.removeItem('scanner_user');
      }
    }
  };

  // ============================================
  // LOGIN SCREEN
  // ============================================

  const handleUserSelect = (userId, username) => {
    setSelectedUserId(userId);
    setPinInput('');
    // Show PIN pad (no actual modal, just update state to show PIN entry)
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
      setScreen('scan');
      setPinInput('');
      setSelectedUserId(null);
      // Save to localStorage for persistent login
      localStorage.setItem('scanner_user', result.user.username);
    } else {
      alert(result.error || 'Incorrect PIN');
      setPinInput('');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setScreen('login');
    setBrand('');
    setPartNumber('');
    setMatches([]);
    setDuplicateWarning(null);
    setSelectedMatch(null);
    // Clear stored login
    localStorage.removeItem('scanner_user');
  };

  // ============================================
  // SCAN SCREEN
  // ============================================

  const handleCameraScan = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsCameraScanning(true);
    try {
      const base64Data = await compressImage(file);
      const response = await fetch('/api/process-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: base64Data, mimeType: 'image/jpeg' })
      });

      const data = await response.json();
      const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';

      const brandMatch = text.match(/BRAND:\s*([^\|\n\r]+)/i);
      const partMatch = text.match(/PART:\s*([^\|\n\r]+)/i);

      if (brandMatch && partMatch) {
        const extractedBrand = brandMatch[1].trim();
        const extractedPart = partMatch[1].trim();

        if (extractedPart.length <= 60) {
          setBrand(extractedBrand);
          setPartNumber(extractedPart);
          // Auto-search
          await performLookup(extractedBrand, extractedPart);
        } else {
          alert('Could not extract part number from scan. Please enter manually.');
        }
      } else {
        alert('Could not extract brand and part number. Please enter manually.');
      }
    } catch (error) {
      console.error('Scan error:', error);
      alert('Scan failed: ' + error.message);
    }
    setIsCameraScanning(false);
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

  const handleManualSearch = async () => {
    if (!partNumber || partNumber.trim().length < 2) {
      alert('Please enter at least 2 characters for part number');
      return;
    }
    await performLookup(brand, partNumber);
  };

  const performLookup = async (searchBrand, searchPartNumber) => {
    setIsProcessing(true);
    try {
      // Search for matches
      const lookupRes = await fetch('/api/scanner/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: searchBrand, partNumber: searchPartNumber })
      });

      const lookupData = await lookupRes.json();

      const allMatches = [...(lookupData.firebaseMatches || []), ...(lookupData.suredoneMatches || [])];

      // Check for duplicates
      const dupRes = await fetch('/api/scanner/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: searchBrand, partNumber: searchPartNumber })
      });

      const dupData = await dupRes.json();

      setMatches(allMatches);
      setDuplicateWarning(dupData.isDuplicate ? dupData : null);

      if (allMatches.length === 0) {
        // No matches — go straight to new item
        await handleCreateNewItem();
      } else {
        setScreen('results');
      }
    } catch (error) {
      console.error('Lookup error:', error);
      alert('Lookup failed: ' + error.message);
    }
    setIsProcessing(false);
  };

  // ============================================
  // RESULTS SCREEN
  // ============================================

  const handleSelectMatch = (match) => {
    setSelectedMatch(match);
    setNewShelf(match.shelf || '');
    setQuantityToAdd(1);
    setScreen('add-stock');
  };

  const handleDuplicateOverride = () => {
    setDuplicateWarning(null);
  };

  const handleNoneMatch = async () => {
    await handleCreateNewItem();
  };

  // ============================================
  // ADD STOCK SCREEN
  // ============================================

  const handleConfirmStockUpdate = async () => {
    if (!selectedMatch) return;

    setIsProcessing(true);
    try {
      const oldStock = selectedMatch.stock || 0;
      const newStock = oldStock + quantityToAdd;

      const response = await fetch('/api/scanner/update-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: selectedMatch.sku,
          newStock: newStock,
          oldStock: oldStock,
          partNumber: partNumber,
          brand: brand,
          shelf: newShelf || selectedMatch.shelf,
          scannedBy: currentUser.username,
          action: 'add_stock',
          firebaseId: selectedMatch.source === 'firebase' ? selectedMatch.id : null
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`✅ ${selectedMatch.sku} updated!\nStock: ${oldStock} → ${newStock}\nShelf: ${newShelf || selectedMatch.shelf || 'Not Assigned'}`);
        setScreen('success');
        // Auto-return to scan after 2 seconds
        setTimeout(() => {
          resetToScan();
        }, 2000);
      } else {
        alert('Update failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Update failed: ' + error.message);
    }
    setIsProcessing(false);
  };

  // ============================================
  // NEW ITEM SCREEN
  // ============================================

  const handleCreateNewItem = async () => {
    setIsProcessing(true);
    try {
      // Call server-side API to generate SKU
      const response = await fetch('/api/generate-sku');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate SKU');
      }

      setNewSku(data.sku);
      setNewCondition('');
      setNewQuantity(1);
      setNewItemShelf('');
      setScreen('new-item');
    } catch (error) {
      console.error('SKU generation error:', error);
      alert('Failed to generate SKU: ' + error.message);
    }
    setIsProcessing(false);
  };

  const handleConfirmNewItem = async () => {
    if (!newCondition) {
      alert('Please select a condition');
      return;
    }

    if (!newItemShelf || newItemShelf.trim().length === 0) {
      alert('Please enter a shelf location');
      return;
    }

    setIsProcessing(true);
    try {
      // Log to activity_log and scan_log
      const response = await fetch('/api/scanner/update-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: newSku,
          newStock: newQuantity,
          oldStock: 0,
          partNumber: partNumber,
          brand: brand,
          shelf: newItemShelf.toUpperCase(),
          scannedBy: currentUser.username,
          action: 'create_new',
          firebaseId: null
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`✅ ${newSku} created!\nCondition: ${newCondition}\nStock: ${newQuantity}\nShelf: ${newItemShelf.toUpperCase()}\n\nQueued for photos & listing`);
        setScreen('success');
        // Auto-return to scan after 3 seconds
        setTimeout(() => {
          resetToScan();
        }, 3000);
      } else {
        alert('Creation failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Create error:', error);
      alert('Creation failed: ' + error.message);
    }
    setIsProcessing(false);
  };

  // ============================================
  // HELPERS
  // ============================================

  const resetToScan = () => {
    setBrand('');
    setPartNumber('');
    setMatches([]);
    setDuplicateWarning(null);
    setSelectedMatch(null);
    setQuantityToAdd(1);
    setNewShelf('');
    setNewSku('');
    setNewCondition('');
    setNewQuantity(1);
    setNewItemShelf('');
    setScreen('scan');
  };

  const getConditionColor = (condition) => {
    const opt = CONDITION_OPTIONS.find(o => o.value === condition || o.label === condition);
    return opt ? opt.color : 'bg-gray-100 border-gray-500 text-gray-900';
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
        onChange={handleImageUpload}
      />

      {/* LOGIN SCREEN */}
      {screen === 'login' && (
        <div className="p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Warehouse Scanner</h1>
            <p className="text-gray-600">Select your name to begin</p>
          </div>

          {selectedUserId === null ? (
            <div className="space-y-4">
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user.id, user.username)}
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

      {/* SCAN SCREEN */}
      {screen === 'scan' && (
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

          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Scan Item</h1>

          <div className="space-y-4 mb-6">
            <button
              onClick={handleCameraScan}
              disabled={isCameraScanning}
              className="w-full p-8 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-4 text-2xl font-bold transition disabled:opacity-50"
            >
              {isCameraScanning ? (
                <>
                  <RefreshCw size={32} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Camera size={32} />
                  📷 Scan Nameplate
                </>
              )}
            </button>

            <div className="text-center text-gray-500 font-semibold">OR</div>

            <div className="bg-white rounded-xl p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Brand (optional)</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Allen-Bradley"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Part Number *</label>
                <input
                  type="text"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                  className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="1769-L23E-QB1B"
                  autoCapitalize="characters"
                />
              </div>
              <button
                onClick={handleManualSearch}
                disabled={isProcessing}
                className="w-full p-4 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-lg flex items-center justify-center gap-3 text-xl font-bold transition disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={24} className="animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Edit3 size={24} />
                    Search
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS SCREEN */}
      {screen === 'results' && (
        <div className="p-6">
          <button
            onClick={resetToScan}
            className="mb-4 flex items-center gap-2 text-blue-600 font-semibold"
          >
            ← Back to Scan
          </button>

          {duplicateWarning && (
            <div className="bg-yellow-100 border-2 border-yellow-500 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle size={24} className="text-yellow-700 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="font-bold text-yellow-900 mb-2">{duplicateWarning.warning}</p>
                  <p className="text-sm text-yellow-800 mb-3">Is this a different unit?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDuplicateOverride}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 active:bg-yellow-700"
                    >
                      Yes, different unit
                    </button>
                    <button
                      onClick={resetToScan}
                      className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg font-semibold hover:bg-gray-400 active:bg-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Found {matches.length} Match{matches.length !== 1 ? 'es' : ''}
          </h2>

          <div className="space-y-4 mb-6">
            {matches.map((match, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectMatch(match)}
                className="w-full bg-white border-2 border-gray-300 rounded-xl p-4 hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 transition text-left"
              >
                <div className="flex items-start gap-4">
                  {match.thumbnail ? (
                    <img src={match.thumbnail} alt="" className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package size={32} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg text-gray-900">{match.sku}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${getConditionColor(match.condition)}`}>
                        {match.condition}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">{match.brand} {match.partNumber}</p>
                    <p className="text-xs text-gray-600 truncate mb-2">{match.title}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-semibold text-gray-900">Stock: {match.stock}</span>
                      <span className="text-gray-600">Shelf: {match.shelf || 'N/A'}</span>
                      <span className="text-gray-600">${match.price}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={handleNoneMatch}
            className="w-full p-4 bg-gray-300 hover:bg-gray-400 active:bg-gray-500 text-gray-900 rounded-lg text-lg font-bold transition"
          >
            None of these match — Create New
          </button>
        </div>
      )}

      {/* ADD STOCK SCREEN */}
      {screen === 'add-stock' && selectedMatch && (
        <div className="p-6">
          <button
            onClick={() => setScreen('results')}
            className="mb-4 flex items-center gap-2 text-blue-600 font-semibold"
          >
            ← Back to Results
          </button>

          <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Stock</h2>

          <div className="bg-white rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4 mb-4">
              {selectedMatch.thumbnail ? (
                <img src={selectedMatch.thumbnail} alt="" className="w-24 h-24 object-cover rounded-lg flex-shrink-0" />
              ) : (
                <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package size={40} className="text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-xl text-gray-900">{selectedMatch.sku}</span>
                  <span className={`px-2 py-1 rounded text-sm font-bold ${getConditionColor(selectedMatch.condition)}`}>
                    {selectedMatch.condition}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">{selectedMatch.brand} {selectedMatch.partNumber}</p>
                <p className="text-xs text-gray-600 mb-2">{selectedMatch.title}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Current Stock</label>
                <div className="text-3xl font-bold text-gray-900">{selectedMatch.stock || 0}</div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">How many adding?</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantityToAdd(Math.max(1, quantityToAdd - 1))}
                    className="w-16 h-16 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg flex items-center justify-center transition"
                  >
                    <Minus size={24} className="text-gray-900" />
                  </button>
                  <input
                    type="number"
                    value={quantityToAdd}
                    onChange={(e) => setQuantityToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 text-center text-3xl font-bold border-2 border-gray-300 rounded-lg py-3 focus:border-blue-500 focus:outline-none"
                    min="1"
                  />
                  <button
                    onClick={() => setQuantityToAdd(quantityToAdd + 1)}
                    className="w-16 h-16 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg flex items-center justify-center transition"
                  >
                    <Plus size={24} className="text-gray-900" />
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-6">
                <div className="text-center text-2xl font-bold text-gray-900">
                  {selectedMatch.stock || 0} + {quantityToAdd} = <span className="text-blue-600">{(selectedMatch.stock || 0) + quantityToAdd}</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Shelf Location</label>
                <input
                  type="text"
                  value={newShelf}
                  onChange={(e) => setNewShelf(e.target.value.toUpperCase())}
                  className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder={selectedMatch.shelf || 'Enter shelf'}
                  autoCapitalize="characters"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleConfirmStockUpdate}
            disabled={isProcessing}
            className="w-full p-6 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-xl flex items-center justify-center gap-3 text-2xl font-bold transition disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw size={28} className="animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Check size={28} />
                ✅ Confirm Update
              </>
            )}
          </button>
        </div>
      )}

      {/* NEW ITEM SCREEN */}
      {screen === 'new-item' && (
        <div className="p-6">
          <button
            onClick={resetToScan}
            className="mb-4 flex items-center gap-2 text-blue-600 font-semibold"
          >
            ← Cancel
          </button>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">New Item</h2>
          <p className="text-gray-600 mb-6">Creating SKU: <span className="font-bold text-blue-600 text-xl">{newSku}</span></p>

          <div className="bg-white rounded-xl p-6 mb-6">
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">Brand</p>
              <p className="text-lg font-bold text-gray-900">{brand || '(not specified)'}</p>
            </div>
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-1">Part Number</p>
              <p className="text-lg font-bold text-gray-900">{partNumber}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Condition *</label>
              <div className="grid grid-cols-2 gap-3">
                {CONDITION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setNewCondition(opt.value)}
                    className={`p-4 border-2 rounded-lg font-bold text-center transition ${
                      newCondition === opt.value
                        ? opt.color + ' border-current'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity *</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setNewQuantity(Math.max(1, newQuantity - 1))}
                  className="w-16 h-16 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg flex items-center justify-center transition"
                >
                  <Minus size={24} className="text-gray-900" />
                </button>
                <input
                  type="number"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 text-center text-3xl font-bold border-2 border-gray-300 rounded-lg py-3 focus:border-blue-500 focus:outline-none"
                  min="1"
                />
                <button
                  onClick={() => setNewQuantity(newQuantity + 1)}
                  className="w-16 h-16 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg flex items-center justify-center transition"
                >
                  <Plus size={24} className="text-gray-900" />
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Shelf Location *</label>
              <input
                type="text"
                value={newItemShelf}
                onChange={(e) => setNewItemShelf(e.target.value.toUpperCase())}
                className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="B-14"
                autoCapitalize="characters"
              />
            </div>
          </div>

          <button
            onClick={handleConfirmNewItem}
            disabled={isProcessing || !newCondition || !newItemShelf}
            className="w-full p-6 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-xl flex items-center justify-center gap-3 text-2xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <RefreshCw size={28} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check size={28} />
                ✅ Create & Queue for Photos
              </>
            )}
          </button>
        </div>
      )}

      {/* SUCCESS SCREEN */}
      {screen === 'success' && (
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={64} className="text-white" />
            </div>
            <pre className="text-2xl font-bold text-gray-900 whitespace-pre-wrap mb-4">{successMessage}</pre>
            <p className="text-gray-600">Returning to scanner...</p>
          </div>
        </div>
      )}
    </div>
  );
}
