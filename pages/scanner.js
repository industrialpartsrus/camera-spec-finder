// pages/scanner.js
// Mobile-first warehouse inventory scanner
// Fast, one-handed operation with big touch targets

import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { Camera, Edit3, LogOut, Plus, Minus, Check, X, AlertTriangle, Package, RefreshCw } from 'lucide-react';
import NotificationCenter from '../components/NotificationCenter';
import UserPicker from '../components/UserPicker';
import app from '../firebase';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, setDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { getCurrentUser, clearCurrentUser, getTeamMemberById } from '../lib/users';
import { printProductLabel } from '../lib/zebra-print';

// Condition configuration - matches Pro Builder CONDITION_OPTIONS exactly
const CONDITIONS = {
  'new_in_box': {
    label: 'New In Box',
    shortLabel: 'NIB',
    bgClass: 'bg-green-600'
  },
  'new_open_box': {
    label: 'New - Open Box',
    shortLabel: 'Open Box',
    bgClass: 'bg-green-500'
  },
  'new_missing_hardware': {
    label: 'New - No Packaging',
    shortLabel: 'No Pkg',
    bgClass: 'bg-green-400'
  },
  'like_new_excellent': {
    label: 'Used - Excellent',
    shortLabel: 'Excellent',
    bgClass: 'bg-blue-500'
  },
  'used_good': {
    label: 'Used - Good',
    shortLabel: 'Good',
    bgClass: 'bg-blue-400'
  },
  'used_fair': {
    label: 'Used - Fair',
    shortLabel: 'Fair',
    bgClass: 'bg-yellow-500'
  },
  'for_parts': {
    label: 'For Parts',
    shortLabel: 'Parts',
    bgClass: 'bg-red-500'
  },
  'refurbished': {
    label: 'Refurbished',
    shortLabel: 'Refurb',
    bgClass: 'bg-purple-500'
  },
};

function getConditionOptions() {
  return Object.entries(CONDITIONS).map(([id, config]) => ({
    id,
    label: config.label,
    shortLabel: config.shortLabel,
    bgClass: config.bgClass,
  }));
}

// ============================================
// LISTING HEALTH CHECK
// ============================================
// Analyzes a SureDone match and returns health status
// GREEN = listing is complete, just add stock
// YELLOW = listing works but has issues worth reviewing
// RED = listing has critical problems, needs rework

function checkListingHealth(match) {
  const issues = [];

  // Only health-check SureDone matches (Firebase-only items are new/in-progress)
  if (match.source !== 'suredone') {
    return { status: 'green', issues: [], routing: 'normal' };
  }

  // --- CRITICAL issues (RED) ---
  const hasPhotos = match.imageCount > 0 || !!match.thumbnail;
  if (!hasPhotos) {
    issues.push({ severity: 'red', message: 'No photos — needs new photos before relisting' });
  }

  if (!match.title || match.title === 'No Title' || match.title.trim().length < 10) {
    issues.push({ severity: 'red', message: 'Missing or incomplete title' });
  }

  if (!match.price || parseFloat(match.price) <= 0) {
    issues.push({ severity: 'red', message: 'No price set' });
  }

  if (!match.ebaycatid) {
    issues.push({ severity: 'red', message: 'No eBay category — cannot list on eBay' });
  }

  // --- WARNING issues (YELLOW) ---
  if (match.imageCount > 0 && match.imageCount < 3) {
    issues.push({ severity: 'yellow', message: `Only ${match.imageCount} photo${match.imageCount === 1 ? '' : 's'} — consider adding more` });
  }

  if (!match.hasDescription) {
    issues.push({ severity: 'yellow', message: 'No description — add one for better SEO' });
  }

  if (!match.ebayid) {
    issues.push({ severity: 'yellow', message: 'Not currently listed on eBay' });
  }

  if (!match.condition || match.condition === 'Unknown') {
    issues.push({ severity: 'yellow', message: 'Condition not set' });
  }

  // Check listing age (over 180 days = stale)
  if (match.datecreated) {
    const created = new Date(match.datecreated);
    const daysSinceCreated = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated > 180) {
      issues.push({ severity: 'yellow', message: `Listing is ${daysSinceCreated} days old — may need refresh` });
    }
  }

  // Determine overall status
  const hasRed = issues.some(i => i.severity === 'red');
  const hasYellow = issues.some(i => i.severity === 'yellow');

  let status, routing;
  if (hasRed) {
    status = 'red';
    routing = 'rework';
  } else if (hasYellow) {
    status = 'yellow';
    routing = 'review';
  } else {
    status = 'green';
    routing = 'normal';
  }

  return { status, issues, routing };
}

export default function WarehouseScanner() {
  // Auth state
  const [screen, setScreen] = useState('scan'); // scan, results, add-stock, new-item, success
  const [currentUser, setCurrentUser] = useState(null);

  // Scanner mode state
  const [scannerMode, setScannerMode] = useState('scan'); // 'scan', 'shelf', or 'requests'
  const [shelfQueue, setShelfQueue] = useState([]);
  const [requestQueue, setRequestQueue] = useState([]);
  const [unsubscribe, setUnsubscribe] = useState(null);
  const [unsubRequests, setUnsubRequests] = useState(null);

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
  const [quantityToAdd, setQuantityToAdd] = useState(0);
  const [newShelf, setNewShelf] = useState('');
  const [stockMode, setStockMode] = useState('add'); // 'add' or 'set'
  const [absoluteStock, setAbsoluteStock] = useState(0);
  const [scannerNote, setScannerNote] = useState('');
  const [overrideCondition, setOverrideCondition] = useState(null);

  // Shipping measurements state (optional)
  const [showShipping, setShowShipping] = useState(false);
  const [shippingWeight, setShippingWeight] = useState('');
  const [shippingLength, setShippingLength] = useState('');
  const [shippingWidth, setShippingWidth] = useState('');
  const [shippingHeight, setShippingHeight] = useState('');

  // New item state
  const [newSku, setNewSku] = useState('');
  const [newCondition, setNewCondition] = useState('used_good'); // Default to 'used_good'
  const [newQuantity, setNewQuantity] = useState(1);
  const [newItemShelf, setNewItemShelf] = useState('');

  // Success state
  const [successMessage, setSuccessMessage] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  // Load current user on mount
  useEffect(() => {
    // Clean up old login keys
    localStorage.removeItem('scanner_user');
    localStorage.removeItem('scanner_name');
    localStorage.removeItem('scanner_pin');

    // Load current user from unified system
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setupShelfListener(user.id);
    }
  }, []);

  const setupShelfListener = (userId) => {
    // Clean up existing listener
    if (unsubscribe) {
      unsubscribe();
    }

    // Listen for items needing shelf return (ALL items, not filtered by user)
    const q = query(
      collection(db, 'products'),
      where('returnToShelf', '==', true)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by returnToShelfAt (newest first)
      items.sort((a, b) => {
        const timeA = a.returnToShelfAt?.toMillis() || 0;
        const timeB = b.returnToShelfAt?.toMillis() || 0;
        return timeB - timeA;
      });

      setShelfQueue(items);
      console.log(`Shelf queue updated: ${items.length} items`);
    }, (error) => {
      console.error('Shelf queue listener error:', error);
    });

    setUnsubscribe(() => unsub);

    // Clean up existing requests listener
    if (unsubRequests) {
      unsubRequests();
    }

    // Listen for pending part requests from office
    const requestsQuery = query(
      collection(db, 'partRequests'),
      where('status', 'in', ['pending', 'acknowledged'])
    );

    const unsubReq = onSnapshot(requestsQuery, (snapshot) => {
      const requests = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      // Sort: urgent first, then by requestedAt (oldest first)
      requests.sort((a, b) => {
        if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
        if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
        const timeA = a.requestedAt?.toMillis?.() || 0;
        const timeB = b.requestedAt?.toMillis?.() || 0;
        return timeA - timeB;
      });
      setRequestQueue(requests);
      console.log(`Request queue updated: ${requests.length} items`);
    }, (error) => {
      console.error('Request queue listener error:', error);
    });

    setUnsubRequests(() => unsubReq);
  };

  // ============================================
  // USER LOGIN/LOGOUT
  // ============================================

  const updateLastActive = async (user) => {
    const u = user || currentUser;
    if (!u?.id) return;
    try {
      await setDoc(doc(db, 'users', u.id), {
        lastActive: serverTimestamp(),
        activeTool: 'scanner',
        name: u.name,
        role: u.role,
      }, { merge: true });
    } catch (err) {
      console.warn('lastActive update failed:', err);
    }
  };

  const handleUserSelect = (user) => {
    setCurrentUser(user);
    setupShelfListener(user.id);
    updateLastActive(user);
  };

  const handleSwitchUser = () => {
    // Clean up Firebase listeners
    if (unsubscribe) {
      unsubscribe();
      setUnsubscribe(null);
    }
    if (unsubRequests) {
      unsubRequests();
      setUnsubRequests(null);
    }

    clearCurrentUser();
    setCurrentUser(null);
    setBrand('');
    setPartNumber('');
    setMatches([]);
    setDuplicateWarning(null);
    setSelectedMatch(null);
    setScannerMode('scan');
    setShelfQueue([]);
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

      // Run health checks on all matches
      const matchesWithHealth = allMatches.map(match => ({
        ...match,
        health: checkListingHealth(match),
      }));

      // Check for duplicates
      const dupRes = await fetch('/api/scanner/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: searchBrand, partNumber: searchPartNumber })
      });

      const dupData = await dupRes.json();

      setMatches(matchesWithHealth);
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
    setQuantityToAdd(0);
    setScannerNote('');
    setStockMode('add');
    setAbsoluteStock(match.stock || 0);
    setOverrideCondition(null);
    // Pre-populate shipping measurements from existing data
    setShippingWeight(match.weight || match.boxweight || '');
    setShippingLength(match.boxlength || '');
    setShippingWidth(match.boxwidth || '');
    setShippingHeight(match.boxheight || '');
    setShowShipping(!!(match.weight || match.boxlength));
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

    const oldStock = parseInt(selectedMatch.stock) || 0;
    const newStock = stockMode === 'set' ? absoluteStock : oldStock + quantityToAdd;

    // If no stock change and no shelf change, nothing to do
    const shelfChanged = newShelf && newShelf !== selectedMatch.shelf;
    if (newStock === oldStock && !shelfChanged && !scannerNote.trim()) {
      alert('No changes to save. Update quantity, shelf location, or add a note.');
      return;
    }

    setIsProcessing(true);
    try {
      const isRestock = oldStock === 0 && newStock > 0;

      const healthRouting = selectedMatch.health?.routing || 'normal';
      const healthStatus = selectedMatch.health?.status || 'green';
      const healthIssues = selectedMatch.health?.issues || [];

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
          condition: overrideCondition !== null && overrideCondition !== selectedMatch.condition
            ? overrideCondition
            : null,
          note: scannerNote.trim() || null,
          scannedBy: currentUser?.name || 'unknown',
          action: 'add_stock',
          firebaseId: selectedMatch.source === 'firebase' ? selectedMatch.id : null,
          healthRouting: healthRouting,
          healthStatus: healthStatus,
          healthIssues: healthIssues.map(i => i.message),
          isRestock: isRestock,
          weight: shippingWeight || null,
          boxLength: shippingLength || null,
          boxWidth: shippingWidth || null,
          boxHeight: shippingHeight || null,
        })
      });

      const data = await response.json();

      if (data.success) {
        updateLastActive();

        // Build base success message
        let msg = `✅ ${selectedMatch.sku} updated!\nStock: ${oldStock} → ${newStock}\nShelf: ${newShelf || selectedMatch.shelf || 'Not Assigned'}`;

        // Restock / channel result notification
        if (isRestock && data.relistResult) {
          if (data.relistResult.success) {
            msg += `\n\n✅ Pushed to eBay! (${data.relistResult.action})`;
          } else if (data.relistResult.needsReview) {
            msg += '\n\n⚠️ ' + data.relistResult.error;
            msg += '\nRouted to Listing Builder queue.';
          } else if (data.relistResult.error) {
            msg += '\n\n⚠️ Channel push: ' + data.relistResult.error;
          }
        } else if (isRestock && data.autoRelisted) {
          msg += '\n\n🔄 AUTO-RELISTED';
        } else if (isRestock) {
          msg += '\n\n📦 RESTOCKED from zero';
        }

        // Show verification results if available
        const v = data.verification;
        if (v) {
          let verifyMsg = '';

          // Stock verification
          if (v.stockVerified) {
            verifyMsg += '✅ Stock verified in SureDone\n';
          } else {
            verifyMsg += `⚠️ Stock mismatch: expected ${v.expectedStock}, got ${v.actualStock}\n`;
          }

          // eBay status
          if (v.ebay.listed) {
            verifyMsg += `✅ eBay: Active (${v.ebay.itemId})\n`;
          } else {
            verifyMsg += '❌ eBay: NOT LISTED\n';
          }

          // BigCommerce status
          if (v.bigcommerce.listed) {
            verifyMsg += '✅ BigCommerce: Active\n';
          } else {
            verifyMsg += '❌ BigCommerce: NOT LISTED\n';
          }

          // Channel issues
          if (v.channelIssues.length > 0) {
            verifyMsg += '\n⚠️ Issues Found:\n';
            v.channelIssues.forEach(issue => {
              verifyMsg += `• ${issue}\n`;
            });
          }

          msg += '\n\n── Channel Status ──\n' + verifyMsg;
        }

        // Condition change message
        if (overrideCondition && overrideCondition !== selectedMatch.condition) {
          msg += `\nCondition: ${CONDITIONS[selectedMatch.condition]?.label || selectedMatch.condition} → ${CONDITIONS[overrideCondition]?.label || overrideCondition}`;
        }

        // Health routing message
        if (healthRouting === 'rework') {
          msg += '\n🔴 FLAGGED FOR REWORK\nPlace in PHOTO STAGING AREA';
        } else if (healthRouting === 'review') {
          msg += '\n🟡 FLAGGED FOR REVIEW\nPlace on shelf — office will update';
        }

        setSuccessMessage(msg);
        setScreen('success');

        // Auto-return timing — longer for items with issues
        const hasIssues = data.verification?.channelIssues?.length > 0
          || healthRouting === 'rework'
          || healthRouting === 'review';

        setTimeout(() => {
          resetToScan();
        }, hasIssues ? 6000 : 2000);
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
      setScannerNote('');
      setShowShipping(false);
      setShippingWeight('');
      setShippingLength('');
      setShippingWidth('');
      setShippingHeight('');
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
          condition: newCondition, // Send condition from Scanner
          shelf: newItemShelf.toUpperCase(),
          note: scannerNote.trim() || null,
          scannedBy: currentUser?.name || 'unknown',
          action: 'create_new',
          firebaseId: null,
          weight: shippingWeight || null,
          boxLength: shippingLength || null,
          boxWidth: shippingWidth || null,
          boxHeight: shippingHeight || null
        })
      });

      const data = await response.json();

      if (data.success) {
        updateLastActive();
        // Trigger AI research immediately (fire-and-forget)
        if (data.firebaseId) {
          fetch('/api/auto-research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: data.firebaseId,
              brand: brand,
              partNumber: partNumber
            })
          }).catch(err => console.error('Auto-research trigger failed:', err));
        }

        setSuccessMessage(`✅ ${newSku} created!\nCondition: ${CONDITIONS[newCondition]?.label || newCondition}\nStock: ${newQuantity}\nShelf: ${newItemShelf.toUpperCase()}\n\nAI research started!\nQueued for photos`);
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
    setQuantityToAdd(0);
    setNewShelf('');
    setNewSku('');
    setNewCondition('');
    setNewQuantity(1);
    setNewItemShelf('');
    setScannerNote('');
    setOverrideCondition(null);
    setScreen('scan');
  };

  const handleConfirmShelved = async (item) => {
    try {
      const productRef = doc(db, 'products', item.id);
      await updateDoc(productRef, {
        returnToShelf: false,
        shelvedAt: Timestamp.now(),
        shelvedBy: currentUser?.name || 'unknown'
      });

      console.log(`${item.sku} marked as shelved by ${currentUser?.name}`);
    } catch (error) {
      console.error('Failed to mark as shelved:', error);
      alert('Failed to mark as shelved: ' + error.message);
    }
  };

  const handleClaimRequest = async (req) => {
    try {
      await updateDoc(doc(db, 'partRequests', req.id), {
        status: 'acknowledged',
        claimedBy: currentUser?.id || currentUser?.name || 'unknown',
        claimedByName: currentUser?.name || 'Unknown',
        claimedAt: serverTimestamp(),
      });
      updateLastActive();
      console.log(`Claimed request: ${req.sku}`);
    } catch (err) {
      console.error('Failed to claim request:', err);
      alert('Failed to claim: ' + err.message);
    }
  };

  const handleCompleteRequest = async (req) => {
    try {
      await updateDoc(doc(db, 'partRequests', req.id), {
        status: 'completed',
        completedBy: currentUser?.id || currentUser?.name || 'unknown',
        completedByName: currentUser?.name || 'Unknown',
        completedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'activityLog'), {
        action: 'request_fulfilled',
        sku: req.sku || '',
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Unknown',
        details: {
          requestedBy: req.requestedByName || req.requestedBy || 'Unknown',
          shelfLocation: req.shelfLocation || '',
          priority: req.priority || 'normal',
        },
        timestamp: serverTimestamp(),
      });

      updateLastActive();
      console.log(`Completed request: ${req.sku}`);
    } catch (err) {
      console.error('Failed to complete request:', err);
      alert('Failed to complete: ' + err.message);
    }
  };

  const getConditionColor = (condition) => {
    // First try direct lookup by condition ID (e.g., 'used_good')
    if (CONDITIONS[condition]) {
      return CONDITIONS[condition].bgClass + ' border-current text-white';
    }
    // Fallback: search by label for legacy conditions
    const entry = Object.entries(CONDITIONS).find(([id, config]) =>
      config.label === condition || config.shortLabel === condition
    );
    return entry ? entry[1].bgClass + ' border-current text-white' : 'bg-gray-100 border-gray-500 text-gray-900';
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <Head>
        <title>📦 Scanner — IPRU</title>
        <link rel="icon" href="/favicon-scanner.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon-scanner.svg" />
      </Head>
      {/* Hidden file input for camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* User Picker Modal - shows when no user selected */}
      {!currentUser && (
        <UserPicker
          onSelect={handleUserSelect}
          title="📱 Warehouse Scanner"
          subtitle="Select your name to begin scanning"
        />
      )}

      <NotificationCenter
        firebaseApp={app}
        userId={currentUser?.id || 'unknown'}
        deviceName={`${currentUser?.name || 'User'}'s Scanner`}
      />

      {/* SCAN SCREEN */}
      {screen === 'scan' && currentUser && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: currentUser.color }}
              />
              <div>
                <p className="text-sm text-gray-600">Logged in as</p>
                <p className="text-xl font-bold text-gray-900">{currentUser.name}</p>
              </div>
            </div>
            <button
              onClick={handleSwitchUser}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 active:bg-gray-400 transition text-sm"
            >
              Switch User
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setScannerMode('scan')}
              className={`flex-1 py-4 rounded-xl font-bold text-lg transition ${
                scannerMode === 'scan'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📦 Scan
            </button>
            <button
              onClick={() => setScannerMode('shelf')}
              className={`flex-1 py-4 rounded-xl font-bold text-lg transition relative ${
                scannerMode === 'shelf'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📍 Shelf
              {shelfQueue.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center animate-pulse">
                  {shelfQueue.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setScannerMode('requests')}
              className={`flex-1 py-4 rounded-xl font-bold text-lg transition relative ${
                scannerMode === 'requests'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📋 Requests
              {requestQueue.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center animate-pulse">
                  {requestQueue.length}
                </span>
              )}
            </button>
          </div>

          {/* SCAN MODE */}
          {scannerMode === 'scan' && (
            <>
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
            </>
          )}

          {/* SHELF MODE */}
          {scannerMode === 'shelf' && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Return Items to Shelf</h1>

              {shelfQueue.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl">
                  <Package size={64} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-xl font-bold text-gray-900 mb-2">No items to return</p>
                  <p className="text-gray-600">All items are on their shelves!</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    {shelfQueue.length} item{shelfQueue.length !== 1 ? 's' : ''} need{shelfQueue.length === 1 ? 's' : ''} shelf return
                  </p>

                  <div className="space-y-4">
                    {shelfQueue.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border-4 border-yellow-500 rounded-xl p-6"
                      >
                        {/* Large shelf location */}
                        <div className="text-center mb-6">
                          <p className="text-sm font-semibold text-gray-600 mb-2">RETURN TO SHELF:</p>
                          <p className="text-6xl font-black text-yellow-900 mb-4">{item.shelf}</p>
                        </div>

                        {/* Item details */}
                        <div className="border-t border-gray-200 pt-4 mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-xl text-gray-900">{item.sku}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${getConditionColor(item.condition)}`}>
                              {item.condition}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-gray-700 mb-1">
                            {item.brand} {item.partNumber}
                          </p>
                          <p className="text-xs text-gray-600">
                            Photos by: {item.photoCompletedBy || 'Unknown'}
                          </p>
                        </div>

                        {/* Confirm button */}
                        <button
                          onClick={() => handleConfirmShelved(item)}
                          className="w-full p-6 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-xl text-2xl font-bold transition flex items-center justify-center gap-3"
                        >
                          <Check size={28} />
                          ✅ Confirm Shelved
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* REQUESTS MODE */}
          {scannerMode === 'requests' && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Requested Items</h1>

              {requestQueue.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl">
                  <Package size={64} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-xl font-bold text-gray-900 mb-2">No pending requests</p>
                  <p className="text-gray-600">All requests have been fulfilled!</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    {requestQueue.length} request{requestQueue.length !== 1 ? 's' : ''} pending
                  </p>

                  <div className="space-y-4">
                    {requestQueue.map((req) => (
                      <div
                        key={req.id}
                        className={`bg-white rounded-xl p-5 border-4 ${
                          req.priority === 'urgent' ? 'border-red-500' : 'border-purple-400'
                        }`}
                      >
                        {/* Priority badge */}
                        {req.priority === 'urgent' && (
                          <div className="bg-red-100 text-red-800 text-sm font-bold px-3 py-1 rounded-lg mb-3 inline-block">
                            🚨 URGENT
                          </div>
                        )}

                        {/* Product info row */}
                        <div className="flex gap-4 mb-3">
                          {req.photoUrl ? (
                            <img src={req.photoUrl} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Package size={24} className="text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-lg text-gray-900">{req.sku || 'No SKU'}</p>
                            <p className="text-sm font-semibold text-gray-700 truncate">
                              {req.brand} {req.partNumber}
                            </p>
                            {req.productCategory && (
                              <p className="text-xs text-gray-500 truncate">{req.productCategory}</p>
                            )}
                          </div>
                        </div>

                        {/* Shelf location */}
                        {req.shelfLocation && (
                          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-3 text-center">
                            <p className="text-xs font-semibold text-yellow-700">SHELF LOCATION</p>
                            <p className="text-3xl font-black text-yellow-900">{req.shelfLocation}</p>
                          </div>
                        )}

                        {/* Note */}
                        {req.note && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <p className="text-xs font-semibold text-gray-500 mb-1">Note:</p>
                            <p className="text-sm text-gray-800">{req.note}</p>
                          </div>
                        )}

                        {/* Requested by / time */}
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                          <span>Requested by: {req.requestedByName || 'Unknown'}</span>
                          <span>
                            {req.requestedAt?.toDate ? new Date(req.requestedAt.toDate()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
                          </span>
                        </div>

                        {/* Claimed by info */}
                        {req.status === 'acknowledged' && req.claimedByName && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3 text-center text-sm">
                            <span className="text-blue-700 font-semibold">Claimed by {req.claimedByName}</span>
                          </div>
                        )}

                        {/* Action buttons */}
                        {req.status === 'pending' ? (
                          <button
                            onClick={() => handleClaimRequest(req)}
                            className="w-full p-4 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl text-xl font-bold transition flex items-center justify-center gap-2"
                          >
                            ✋ Claim This Request
                          </button>
                        ) : req.status === 'acknowledged' ? (
                          <button
                            onClick={() => handleCompleteRequest(req)}
                            className="w-full p-4 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-xl text-xl font-bold transition flex items-center justify-center gap-2"
                          >
                            <Check size={24} />
                            ✅ Mark Complete
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
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
                className={`w-full border-2 rounded-xl p-4 hover:bg-blue-50 active:bg-blue-100 transition text-left ${
                  match.health?.status === 'red' ? 'bg-red-50 border-red-300' :
                  match.health?.status === 'yellow' ? 'bg-yellow-50 border-yellow-300' :
                  'bg-white border-gray-300 hover:border-blue-500'
                }`}
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
                      {match.isQueueItem && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 border border-blue-300">
                          In Queue
                        </span>
                      )}
                      {match.health && match.health.status !== 'green' && (
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          match.health.status === 'red' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-white'
                        }`}>
                          {match.health.status === 'red' ? 'NEEDS REWORK' : 'NEEDS REVIEW'}
                        </span>
                      )}
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

            {/* Health Check Banner */}
            {selectedMatch.health && selectedMatch.health.status === 'red' && (
              <div className="border-2 border-red-500 bg-red-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🔴</span>
                  <span className="font-bold text-red-900 text-lg">LISTING NEEDS REWORK</span>
                </div>
                <div className="space-y-2 mb-4">
                  {selectedMatch.health.issues.map((issue, i) => (
                    <div key={i} className={`flex items-start gap-2 text-sm font-semibold ${
                      issue.severity === 'red' ? 'text-red-800' : 'text-yellow-800'
                    }`}>
                      <span>{issue.severity === 'red' ? '❌' : '⚠️'}</span>
                      <span>{issue.message}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                  <p className="font-bold text-red-900 text-sm mb-2">WORKER INSTRUCTIONS:</p>
                  <ul className="text-sm text-red-800 space-y-1">
                    {!selectedMatch.thumbnail && !selectedMatch.imageCount && (
                      <li>📷 Place item on PHOTO SHELF for new photos</li>
                    )}
                    {(!selectedMatch.title || selectedMatch.title === 'No Title') && (
                      <li>📝 Item needs title — route to Pro Builder</li>
                    )}
                    {(!selectedMatch.price || parseFloat(selectedMatch.price) <= 0) && (
                      <li>💰 Item needs pricing — route to Pro Builder</li>
                    )}
                    {!selectedMatch.ebaycatid && (
                      <li>📁 No eBay category — route to Pro Builder</li>
                    )}
                    <li>⬆️ Stock will be updated, item flagged for rework in Pro Builder</li>
                  </ul>
                </div>
              </div>
            )}

            {selectedMatch.health && selectedMatch.health.status === 'yellow' && (
              <div className="border-2 border-yellow-400 bg-yellow-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🟡</span>
                  <span className="font-bold text-yellow-900 text-lg">LISTING NEEDS REVIEW</span>
                </div>
                <div className="space-y-2">
                  {selectedMatch.health.issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm font-semibold text-yellow-800">
                      <span>⚠️</span>
                      <span>{issue.message}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-yellow-700 mt-3">Stock will be updated. Item flagged for review in Pro Builder.</p>
              </div>
            )}

            {selectedMatch.health && selectedMatch.health.status === 'green' && (
              <div className="border border-green-300 bg-green-50 rounded-xl p-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🟢</span>
                  <span className="font-bold text-green-800">Listing looks good — just update stock</span>
                </div>
              </div>
            )}

            {/* Condition Check */}
            <div className="border-t pt-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">
                  Condition
                </label>
                <button
                  onClick={() => setOverrideCondition(
                    overrideCondition !== null ? null : selectedMatch.condition
                  )}
                  className="text-xs text-blue-600 font-medium"
                >
                  {overrideCondition !== null ? 'Cancel Change' : 'Change'}
                </button>
              </div>

              {overrideCondition === null ? (
                <div className={`text-center py-2 px-4 rounded-lg text-lg font-bold ${getConditionColor(selectedMatch.condition)}`}>
                  {CONDITIONS[selectedMatch.condition]?.label || selectedMatch.condition}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CONDITIONS).map(([id, config]) => (
                    <button
                      key={id}
                      onClick={() => setOverrideCondition(id)}
                      className={`py-3 px-2 rounded-lg text-sm font-bold transition border-2 ${
                        overrideCondition === id
                          ? `${config.bgClass} text-white border-transparent`
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {config.label || config.shortLabel}
                    </button>
                  ))}
                </div>
              )}

              {overrideCondition !== null && overrideCondition !== selectedMatch.condition && (
                <div className="mt-2 bg-amber-50 border border-amber-300 rounded-lg p-2 text-sm text-amber-800">
                  Condition will change from <strong>
                    {CONDITIONS[selectedMatch.condition]?.label || selectedMatch.condition}
                  </strong> to <strong>
                    {CONDITIONS[overrideCondition]?.label || overrideCondition}
                  </strong>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Current Stock</label>
                <div className="text-3xl font-bold text-gray-900">{selectedMatch.stock || 0}</div>
              </div>

              {/* Stock Mode Toggle */}
              <div className="mb-4">
                <div className="flex border-2 border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setStockMode('add')}
                    className={`flex-1 py-3 text-center font-bold text-lg transition ${
                      stockMode === 'add'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    + Add to Stock
                  </button>
                  <button
                    onClick={() => {
                      setStockMode('set');
                      setAbsoluteStock(selectedMatch.stock || 0);
                    }}
                    className={`flex-1 py-3 text-center font-bold text-lg transition ${
                      stockMode === 'set'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    = Set Stock
                  </button>
                </div>
              </div>

              {stockMode === 'add' ? (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">How many adding?</label>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', maxWidth: '250px', margin: '0 auto' }}>
                      <button
                        onClick={() => setQuantityToAdd(Math.max(0, quantityToAdd - 1))}
                        className="w-16 h-16 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg flex items-center justify-center transition"
                      >
                        <Minus size={24} className="text-gray-900" />
                      </button>
                      <input
                        type="number"
                        value={quantityToAdd}
                        onChange={(e) => setQuantityToAdd(Math.max(0, parseInt(e.target.value) || 0))}
                        style={{ width: '80px', textAlign: 'center' }}
                        className="text-3xl font-bold border-2 border-gray-300 rounded-lg py-3 focus:border-blue-500 focus:outline-none"
                        min="0"
                      />
                      <button
                        onClick={() => setQuantityToAdd(quantityToAdd + 1)}
                        className="w-16 h-16 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg flex items-center justify-center transition"
                      >
                        <Plus size={24} className="text-gray-900" />
                      </button>
                    </div>
                    {quantityToAdd === 0 && (
                      <p className="text-center text-sm text-gray-500 mt-2">+0 = shelf/location update only</p>
                    )}
                  </div>

                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-6">
                    <div className="text-center text-2xl font-bold text-gray-900">
                      {quantityToAdd === 0 ? (
                        <span className="text-gray-500">
                          Stock stays at {selectedMatch.stock || 0} — shelf update only
                        </span>
                      ) : (
                        <>
                          {selectedMatch.stock || 0} + {quantityToAdd} = {' '}
                          <span className="text-blue-600">
                            {(selectedMatch.stock || 0) + quantityToAdd}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Set stock to exactly:</label>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', maxWidth: '250px', margin: '0 auto' }}>
                      <button
                        onClick={() => setAbsoluteStock(Math.max(0, absoluteStock - 1))}
                        className="w-16 h-16 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg flex items-center justify-center transition"
                      >
                        <Minus size={24} className="text-gray-900" />
                      </button>
                      <input
                        type="number"
                        value={absoluteStock}
                        onChange={(e) => setAbsoluteStock(Math.max(0, parseInt(e.target.value) || 0))}
                        style={{ width: '80px', textAlign: 'center' }}
                        className="text-3xl font-bold border-2 border-orange-400 rounded-lg py-3 focus:border-orange-500 focus:outline-none"
                        min="0"
                      />
                      <button
                        onClick={() => setAbsoluteStock(absoluteStock + 1)}
                        className="w-16 h-16 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg flex items-center justify-center transition"
                      >
                        <Plus size={24} className="text-gray-900" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-6">
                    <div className="text-center text-2xl font-bold text-gray-900">
                      {selectedMatch.stock || 0} → <span className="text-orange-600">{absoluteStock}</span>
                    </div>
                    {absoluteStock < (selectedMatch.stock || 0) && (
                      <p className="text-center text-sm text-orange-700 mt-1 font-semibold">
                        ⚠️ Reducing stock by {(selectedMatch.stock || 0) - absoluteStock}
                      </p>
                    )}
                  </div>
                </>
              )}

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

              {/* Notes for office team */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Note for Office (optional)
                </label>
                <textarea
                  value={scannerNote}
                  onChange={(e) => setScannerNote(e.target.value)}
                  placeholder="e.g. Item has scratches on front panel, missing mounting bracket, comes with cable..."
                  className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                  rows={2}
                  maxLength={500}
                />
                {scannerNote.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {scannerNote.length}/500
                  </p>
                )}
              </div>

              {/* Shipping Measurements (collapsible) */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setShowShipping(!showShipping)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-800"
                >
                  <span className={`transform transition-transform ${showShipping ? 'rotate-90' : ''}`}>▶</span>
                  📦 Shipping Measurements
                  {(shippingWeight || shippingLength || shippingWidth || shippingHeight) && !showShipping && (
                    <span className="text-xs text-green-600 ml-2">
                      {shippingWeight ? `${shippingWeight}lb` : ''} {shippingLength && shippingWidth && shippingHeight ? `${shippingLength}×${shippingWidth}×${shippingHeight}"` : ''}
                    </span>
                  )}
                </button>
                {showShipping && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg border space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Weight (lbs)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={shippingWeight}
                        onChange={(e) => setShippingWeight(e.target.value)}
                        placeholder="e.g. 2.5"
                        className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Length (in)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={shippingLength}
                          onChange={(e) => setShippingLength(e.target.value)}
                          placeholder="L"
                          className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Width (in)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={shippingWidth}
                          onChange={(e) => setShippingWidth(e.target.value)}
                          placeholder="W"
                          className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Height (in)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={shippingHeight}
                          onChange={(e) => setShippingHeight(e.target.value)}
                          placeholder="H"
                          className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
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
            ) : stockMode === 'add' && quantityToAdd === 0 ? (
              <>
                <Check size={28} />
                Update Shelf Only
              </>
            ) : (
              <>
                <Check size={28} />
                {stockMode === 'set' ? `Set Stock to ${absoluteStock}` : `Add ${quantityToAdd} to Stock`}
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
                {getConditionOptions().map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setNewCondition(opt.id)}
                    className={`p-4 border-2 rounded-lg font-bold text-center transition ${
                      newCondition === opt.id
                        ? opt.bgClass + ' text-white border-current'
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', maxWidth: '250px', margin: '0 auto' }}>
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
                  style={{ width: '80px', textAlign: 'center' }}
                  className="text-3xl font-bold border-2 border-gray-300 rounded-lg py-3 focus:border-blue-500 focus:outline-none"
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

            {/* Notes for office team */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Note for Office (optional)
              </label>
              <textarea
                value={scannerNote}
                onChange={(e) => setScannerNote(e.target.value)}
                placeholder="e.g. Item has scratches on front panel, missing mounting bracket, comes with cable..."
                className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                rows={2}
                maxLength={500}
              />
              {scannerNote.length > 0 && (
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {scannerNote.length}/500
                </p>
              )}
            </div>

              {/* Shipping Measurements (collapsible) */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setShowShipping(!showShipping)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-800"
                >
                  <span className={`transform transition-transform ${showShipping ? 'rotate-90' : ''}`}>▶</span>
                  📦 Shipping Measurements
                  {(shippingWeight || shippingLength || shippingWidth || shippingHeight) && !showShipping && (
                    <span className="text-xs text-green-600 ml-2">
                      {shippingWeight ? `${shippingWeight}lb` : ''} {shippingLength && shippingWidth && shippingHeight ? `${shippingLength}×${shippingWidth}×${shippingHeight}"` : ''}
                    </span>
                  )}
                </button>
                {showShipping && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg border space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Weight (lbs)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={shippingWeight}
                        onChange={(e) => setShippingWeight(e.target.value)}
                        placeholder="e.g. 2.5"
                        className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Length (in)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={shippingLength}
                          onChange={(e) => setShippingLength(e.target.value)}
                          placeholder="L"
                          className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Width (in)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={shippingWidth}
                          onChange={(e) => setShippingWidth(e.target.value)}
                          placeholder="W"
                          className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Height (in)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={shippingHeight}
                          onChange={(e) => setShippingHeight(e.target.value)}
                          placeholder="H"
                          className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
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

            {/* Print Label Button */}
            <button
              onClick={async () => {
                setIsPrinting(true);
                try {
                  const result = await printProductLabel({
                    sku: selectedMatch?.sku || '',
                    brand: brand || selectedMatch?.brand || '',
                    partNumber: partNumber || selectedMatch?.partNumber || '',
                    shelf: newShelf || selectedMatch?.shelf || '',
                    price: selectedMatch?.price || '',
                    condition: selectedMatch?.condition || '',
                    requestedBy: currentUser?.name || 'Scanner',
                  });

                  if (result.method === 'queued') {
                    alert('🏷️ Label sent to print queue!');
                  }
                  setTimeout(() => setIsPrinting(false), 2000);
                } catch (err) {
                  console.error('Print error:', err);
                  alert('Print failed: ' + err.message);
                  setIsPrinting(false);
                }
              }}
              disabled={isPrinting}
              className="mt-4 px-6 py-4 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl text-lg font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
            >
              {isPrinting ? '🖨️ Sending...' : '🏷️ Print Label'}
            </button>

            {isPrinting && (
              <p className="text-sm text-green-600 mt-2 font-medium">Label sent to printer</p>
            )}

            <p className="text-gray-600 mt-4">Returning to scanner...</p>
          </div>
        </div>
      )}
    </div>
  );
}
