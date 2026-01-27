import React, { useState, useEffect, useCallback } from 'react';

/**
 * ListingQualityEditor Component
 * 
 * Analyzes listings against eBay category requirements and suggests improvements.
 * Uses the local category aspects database + platform detection for auto-fill.
 */

// Platform detection patterns (from ebay-category-aspects.json)
const PLATFORM_DETECTION = {
  "Allen-Bradley": {
    "1756-": "ControlLogix",
    "1769-": "CompactLogix",
    "1768-": "CompactLogix",
    "1746-": "SLC 500",
    "1747-": "SLC 500",
    "1745-": "PLC-5",
    "1771-": "PLC-5",
    "1761-": "MicroLogix1000",
    "1762-": "MicroLogix1200",
    "1763-": "MicroLogix1100",
    "1764-": "MicroLogix1500",
    "1766-": "MicroLogix1400",
    "1734-": "POINT I/O",
    "1794-": "FLEX I/O",
    "2080-": "Micro800",
    "2085-": "Micro800",
    "20-": "PowerFlex",
    "22-": "PowerFlex"
  },
  "Siemens": {
    "6ES7 21": "S7/200",
    "6ES7 22": "S7/200",
    "6ES7 31": "S7/300",
    "6ES7 32": "S7/300",
    "6ES7 33": "S7/300",
    "6ES7 34": "S7/300",
    "6ES7 35": "S7/300",
    "6ES7 41": "S7/400",
    "6ES7 51": "S7/1500",
    "6ES7 52": "S7/1500",
    "6ES5": "S5",
    "6ED1": "LOGO!",
    "6AV": "HMI Panel"
  },
  "GE": {
    "IC693": "90-30",
    "IC697": "90-70",
    "IC200": "VersaMax",
    "IC695": "RX3i"
  },
  "Omron": {
    "CJ1": "CJ1",
    "CJ2": "CJ2",
    "CP1": "CP1",
    "CS1": "CS1"
  },
  "Mitsubishi": {
    "FX": "FX Series",
    "QJ": "Q Series",
    "AJ": "A Series"
  },
  "Yaskawa": {
    "SGDV": "Sigma-5",
    "SGDM": "Sigma-3",
    "SGDS": "Sigma-2",
    "CIMR": "VFD"
  },
  "FANUC": {
    "A06B": "Servo/Spindle",
    "A02B": "CNC Control",
    "A03B": "I/O Module"
  }
};

// Brand detection from part number prefixes
const BRAND_DETECTION = {
  "1756": "Allen-Bradley",
  "1769": "Allen-Bradley",
  "1746": "Allen-Bradley",
  "1747": "Allen-Bradley",
  "1761": "Allen-Bradley",
  "1762": "Allen-Bradley",
  "1763": "Allen-Bradley",
  "1764": "Allen-Bradley",
  "1766": "Allen-Bradley",
  "1794": "Allen-Bradley",
  "1734": "Allen-Bradley",
  "2080": "Allen-Bradley",
  "20-": "Allen-Bradley",
  "22-": "Allen-Bradley",
  "6ES": "Siemens",
  "6ED": "Siemens",
  "6AV": "Siemens",
  "6SL": "Siemens",
  "6SE": "Siemens",
  "IC69": "GE",
  "IC20": "GE",
  "A06B": "FANUC",
  "A02B": "FANUC",
  "A03B": "FANUC",
  "CJ1": "Omron",
  "CJ2": "Omron",
  "CP1": "Omron",
  "SGDV": "Yaskawa",
  "SGDM": "Yaskawa",
  "CIMR": "Yaskawa"
};

// Styles
const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #e5e7eb'
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1f2937'
  },
  inputSection: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px'
  },
  inputRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '15px',
    marginBottom: '15px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '5px'
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px'
  },
  buttonSecondary: {
    padding: '10px 20px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    marginLeft: '10px'
  },
  scoreCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  scoreCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '700',
    color: 'white'
  },
  scoreDetails: {
    flex: 1
  },
  aspectsSection: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  aspectsHeader: {
    padding: '15px 20px',
    backgroundColor: '#f3f4f6',
    fontWeight: '600',
    fontSize: '16px',
    borderBottom: '1px solid #e5e7eb'
  },
  aspectRow: {
    display: 'grid',
    gridTemplateColumns: '200px 1fr 150px 100px',
    padding: '12px 20px',
    borderBottom: '1px solid #f3f4f6',
    alignItems: 'center'
  },
  aspectName: {
    fontWeight: '500',
    color: '#374151'
  },
  aspectValue: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  badge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  badgeRequired: {
    backgroundColor: '#fef2f2',
    color: '#dc2626'
  },
  badgeRecommended: {
    backgroundColor: '#fffbeb',
    color: '#d97706'
  },
  badgeOptional: {
    backgroundColor: '#f0fdf4',
    color: '#16a34a'
  },
  badgeFilled: {
    backgroundColor: '#dbeafe',
    color: '#2563eb'
  },
  badgeMissing: {
    backgroundColor: '#fee2e2',
    color: '#dc2626'
  },
  suggestButton: {
    padding: '4px 10px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  suggestionDropdown: {
    padding: '8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    minWidth: '200px'
  },
  autoDetected: {
    fontSize: '12px',
    color: '#059669',
    fontStyle: 'italic'
  },
  noData: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280'
  }
};

// Helper: Detect brand from part number
function detectBrand(partNumber) {
  if (!partNumber) return null;
  const pn = partNumber.toUpperCase().replace(/[\s-]/g, '');
  
  for (const [prefix, brand] of Object.entries(BRAND_DETECTION)) {
    if (pn.startsWith(prefix.replace('-', ''))) {
      return brand;
    }
  }
  return null;
}

// Helper: Detect platform from brand and part number
function detectPlatform(brand, partNumber) {
  if (!brand || !partNumber) return null;
  
  const patterns = PLATFORM_DETECTION[brand];
  if (!patterns) return null;
  
  const pn = partNumber.toUpperCase();
  for (const [prefix, platform] of Object.entries(patterns)) {
    if (pn.includes(prefix.replace(/[\s-]/g, ''))) {
      return platform;
    }
  }
  return null;
}

// Helper: Calculate quality score
function calculateScore(aspects, filledFields) {
  let maxPoints = 0;
  let earnedPoints = 0;
  
  // Required fields: 30 points each
  aspects.required?.forEach(aspect => {
    maxPoints += 30;
    if (filledFields[aspect.name]) earnedPoints += 30;
  });
  
  // Recommended fields: 15 points each
  aspects.recommended?.forEach(aspect => {
    maxPoints += 15;
    if (filledFields[aspect.name]) earnedPoints += 15;
  });
  
  // Optional fields: 5 points each (max 25 points total)
  let optionalPoints = 0;
  aspects.optional?.forEach(aspect => {
    if (filledFields[aspect.name] && optionalPoints < 25) {
      optionalPoints += 5;
    }
  });
  maxPoints += 25;
  earnedPoints += optionalPoints;
  
  return maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;
}

// Helper: Get score color
function getScoreColor(score) {
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#d97706';
  return '#dc2626';
}

// Main Component
export default function ListingQualityEditor({ categoryAspects = null }) {
  const [listing, setListing] = useState({
    sku: '',
    title: '',
    mpn: '',
    brand: '',
    categoryId: '',
    controllerPlatform: '',
    type: ''
  });
  
  const [aspects, setAspects] = useState(null);
  const [filledFields, setFilledFields] = useState({});
  const [autoDetections, setAutoDetections] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch category aspects when categoryId changes
  const fetchAspects = useCallback(async (categoryId) => {
    if (!categoryId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // First check local database if provided
      if (categoryAspects?.categories?.[categoryId]) {
        setAspects(categoryAspects.categories[categoryId].aspects);
        setLoading(false);
        return;
      }
      
      // Otherwise fetch from API
      const response = await fetch(`/api/ebay/get-category-aspects?categoryId=${categoryId}`);
      const data = await response.json();
      
      if (data.success) {
        setAspects({
          required: data.required || [],
          recommended: data.recommended || [],
          optional: data.optional || []
        });
      } else {
        setError(data.error || 'Failed to fetch category aspects');
      }
    } catch (err) {
      setError('Error fetching category data: ' + err.message);
    }
    
    setLoading(false);
  }, [categoryAspects]);

  // Auto-detect brand and platform when MPN changes
  useEffect(() => {
    if (listing.mpn) {
      const detectedBrand = detectBrand(listing.mpn);
      const detectedPlatform = detectedBrand ? detectPlatform(detectedBrand, listing.mpn) : null;
      
      const newDetections = {};
      
      if (detectedBrand && !listing.brand) {
        newDetections.Brand = detectedBrand;
        setListing(prev => ({ ...prev, brand: detectedBrand }));
        setFilledFields(prev => ({ ...prev, Brand: detectedBrand }));
      }
      
      if (detectedPlatform && !listing.controllerPlatform) {
        newDetections['Controller Platform'] = detectedPlatform;
        setListing(prev => ({ ...prev, controllerPlatform: detectedPlatform }));
        setFilledFields(prev => ({ ...prev, 'Controller Platform': detectedPlatform }));
      }
      
      setAutoDetections(newDetections);
    }
  }, [listing.mpn]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setListing(prev => ({ ...prev, [field]: value }));
    
    // Map UI fields to aspect names
    const aspectFieldMap = {
      brand: 'Brand',
      mpn: 'MPN',
      controllerPlatform: 'Controller Platform',
      type: 'Type'
    };
    
    if (aspectFieldMap[field]) {
      setFilledFields(prev => ({
        ...prev,
        [aspectFieldMap[field]]: value
      }));
    }
  };

  // Handle category change
  const handleCategoryChange = (categoryId) => {
    setListing(prev => ({ ...prev, categoryId }));
    fetchAspects(categoryId);
  };

  // Apply suggestion to a field
  const applySuggestion = (aspectName, value) => {
    setFilledFields(prev => ({ ...prev, [aspectName]: value }));
    
    // Also update the main listing state for key fields
    const fieldMap = {
      'Brand': 'brand',
      'MPN': 'mpn',
      'Controller Platform': 'controllerPlatform',
      'Type': 'type'
    };
    
    if (fieldMap[aspectName]) {
      setListing(prev => ({ ...prev, [fieldMap[aspectName]]: value }));
    }
  };

  // Render aspect row
  const renderAspectRow = (aspect, priority) => {
    const value = filledFields[aspect.name] || '';
    const isAutoDetected = autoDetections[aspect.name];
    const isFilled = !!value;
    
    return (
      <div key={aspect.name} style={styles.aspectRow}>
        <div style={styles.aspectName}>
          {aspect.name}
          {isAutoDetected && (
            <div style={styles.autoDetected}>✓ Auto-detected</div>
          )}
        </div>
        
        <div style={styles.aspectValue}>
          {aspect.allowedValues?.length > 0 ? (
            <select
              style={styles.suggestionDropdown}
              value={value}
              onChange={(e) => applySuggestion(aspect.name, e.target.value)}
            >
              <option value="">-- Select --</option>
              {aspect.allowedValues.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              style={{ ...styles.input, flex: 1, maxWidth: '300px' }}
              value={value}
              onChange={(e) => applySuggestion(aspect.name, e.target.value)}
              placeholder={`Enter ${aspect.name}`}
            />
          )}
          
          {aspect.acceptsCustom && aspect.allowedValues?.length > 0 && (
            <input
              type="text"
              style={{ ...styles.input, width: '150px' }}
              placeholder="Or custom..."
              onChange={(e) => applySuggestion(aspect.name, e.target.value)}
            />
          )}
        </div>
        
        <div>
          <span style={{
            ...styles.badge,
            ...(priority === 'required' ? styles.badgeRequired : 
                priority === 'recommended' ? styles.badgeRecommended : 
                styles.badgeOptional)
          }}>
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </span>
        </div>
        
        <div>
          <span style={{
            ...styles.badge,
            ...(isFilled ? styles.badgeFilled : styles.badgeMissing)
          }}>
            {isFilled ? '✓ Filled' : '✗ Missing'}
          </span>
        </div>
      </div>
    );
  };

  const score = aspects ? calculateScore(aspects, filledFields) : 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📋 Listing Quality Editor</h1>
      </div>

      {/* Input Section */}
      <div style={styles.inputSection}>
        <div style={styles.inputRow}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>SKU</label>
            <input
              type="text"
              style={styles.input}
              value={listing.sku}
              onChange={(e) => handleInputChange('sku', e.target.value)}
              placeholder="e.g., IP04082"
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>MPN / Part Number</label>
            <input
              type="text"
              style={styles.input}
              value={listing.mpn}
              onChange={(e) => handleInputChange('mpn', e.target.value)}
              placeholder="e.g., 1756-L72"
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>eBay Category ID</label>
            <input
              type="text"
              style={styles.input}
              value={listing.categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              placeholder="e.g., 181708"
            />
          </div>
        </div>
        
        <div style={styles.inputRow}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Title</label>
            <input
              type="text"
              style={styles.input}
              value={listing.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Listing title..."
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Brand {autoDetections.Brand && <span style={styles.autoDetected}>(auto)</span>}</label>
            <input
              type="text"
              style={styles.input}
              value={listing.brand}
              onChange={(e) => handleInputChange('brand', e.target.value)}
              placeholder="e.g., Allen-Bradley"
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Controller Platform {autoDetections['Controller Platform'] && <span style={styles.autoDetected}>(auto)</span>}
            </label>
            <input
              type="text"
              style={styles.input}
              value={listing.controllerPlatform}
              onChange={(e) => handleInputChange('controllerPlatform', e.target.value)}
              placeholder="e.g., ControlLogix"
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            style={styles.button}
            onClick={() => fetchAspects(listing.categoryId)}
            disabled={!listing.categoryId || loading}
          >
            {loading ? 'Loading...' : 'Analyze Listing'}
          </button>
          
          <button
            style={styles.buttonSecondary}
            onClick={() => {
              setListing({ sku: '', title: '', mpn: '', brand: '', categoryId: '', controllerPlatform: '', type: '' });
              setFilledFields({});
              setAspects(null);
              setAutoDetections({});
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '15px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Score Card */}
      {aspects && (
        <div style={styles.scoreCard}>
          <div style={{ ...styles.scoreCircle, backgroundColor: getScoreColor(score) }}>
            {score}
          </div>
          <div style={styles.scoreDetails}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>Listing Quality Score</h3>
            <p style={{ margin: 0, color: '#6b7280' }}>
              {score >= 80 ? '🎉 Excellent! Your listing is well-optimized.' :
               score >= 60 ? '👍 Good, but there\'s room for improvement.' :
               '⚠️ Needs attention. Fill in more fields for better visibility.'}
            </p>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#9ca3af' }}>
              Required: {aspects.required?.length || 0} | 
              Recommended: {aspects.recommended?.length || 0} | 
              Optional: {aspects.optional?.length || 0}
            </p>
          </div>
        </div>
      )}

      {/* Aspects Section */}
      {aspects && (
        <div style={styles.aspectsSection}>
          {/* Required */}
          {aspects.required?.length > 0 && (
            <>
              <div style={{ ...styles.aspectsHeader, backgroundColor: '#fef2f2', color: '#dc2626' }}>
                🔴 Required Fields ({aspects.required.length})
              </div>
              {aspects.required.map(aspect => renderAspectRow(aspect, 'required'))}
            </>
          )}
          
          {/* Recommended */}
          {aspects.recommended?.length > 0 && (
            <>
              <div style={{ ...styles.aspectsHeader, backgroundColor: '#fffbeb', color: '#d97706' }}>
                🟡 Recommended Fields ({aspects.recommended.length})
              </div>
              {aspects.recommended.map(aspect => renderAspectRow(aspect, 'recommended'))}
            </>
          )}
          
          {/* Optional (collapsed by default, show first 5) */}
          {aspects.optional?.length > 0 && (
            <>
              <div style={{ ...styles.aspectsHeader, backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                🟢 Optional Fields ({aspects.optional.length})
              </div>
              {aspects.optional.slice(0, 5).map(aspect => renderAspectRow(aspect, 'optional'))}
              {aspects.optional.length > 5 && (
                <div style={{ padding: '10px 20px', color: '#6b7280', fontSize: '14px' }}>
                  + {aspects.optional.length - 5} more optional fields...
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!aspects && !loading && (
        <div style={styles.noData}>
          <p>Enter an eBay Category ID and click "Analyze Listing" to see required fields.</p>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>
            Common categories: 181708 (PLCs), 78191 (Servo Drives), 78192 (VFDs), 181709 (HMIs)
          </p>
        </div>
      )}
    </div>
  );
}
