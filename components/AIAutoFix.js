import React, { useState, useCallback } from 'react';

/**
 * AIAutoFix Component
 * 
 * Uses AI to extract specs from titles and auto-populate missing fields.
 * Allows review before pushing to SureDone.
 */

const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px'
  },
  header: {
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #e5e7eb'
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1f2937'
  },
  subtitle: {
    color: '#6b7280',
    marginTop: '5px'
  },
  inputSection: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px'
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'monospace'
  },
  buttonRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
    alignItems: 'center'
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  buttonGreen: {
    padding: '10px 20px',
    backgroundColor: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  buttonOrange: {
    padding: '10px 20px',
    backgroundColor: '#ea580c',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  buttonSecondary: {
    padding: '10px 20px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  progressBar: {
    width: '100%',
    height: '20px',
    backgroundColor: '#e5e7eb',
    borderRadius: '10px',
    overflow: 'hidden',
    marginTop: '15px'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    transition: 'width 0.3s ease'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '15px',
    marginBottom: '20px'
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '15px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '5px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'uppercase'
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '15px',
    overflow: 'hidden'
  },
  itemHeader: {
    padding: '15px 20px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  itemBody: {
    padding: '20px'
  },
  specsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px'
  },
  specField: {
    display: 'flex',
    flexDirection: 'column'
  },
  specLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
    textTransform: 'uppercase'
  },
  specValue: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#f0fdf4'
  },
  specValueEmpty: {
    padding: '8px 12px',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fef2f2',
    color: '#9ca3af',
    fontStyle: 'italic'
  },
  specInput: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  },
  badgeNew: {
    backgroundColor: '#dbeafe',
    color: '#2563eb'
  },
  badgeReviewed: {
    backgroundColor: '#dcfce7',
    color: '#16a34a'
  },
  badgePending: {
    backgroundColor: '#fef3c7',
    color: '#d97706'
  },
  actionButtons: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid #e5e7eb'
  },
  smallButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
  }
};

export default function AIAutoFix() {
  const [skuInput, setSkuInput] = useState('');
  const [items, setItems] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });

  const parseSkus = (input) => {
    return input.split(/[\n,\s]+/).map(s => s.trim()).filter(s => s.length > 0);
  };

  // Fetch items from SureDone
  const fetchItems = async () => {
    const skus = parseSkus(skuInput);
    if (skus.length === 0) return;

    setProcessing(true);
    setProgress({ current: 0, total: skus.length, phase: 'Loading items...' });
    
    const loadedItems = [];

    for (let i = 0; i < skus.length; i++) {
      const sku = skus[i];
      setProgress({ current: i + 1, total: skus.length, phase: 'Loading items...' });

      try {
        const response = await fetch(`/api/suredone/get-item?sku=${encodeURIComponent(sku)}`);
        const data = await response.json();
        
        if (data.success && data.item) {
          loadedItems.push({
            ...data.item,
            status: 'loaded',
            extracted: null,
            edited: {}
          });
        }
      } catch (err) {
        console.error(`Error loading ${sku}:`, err);
      }

      await new Promise(r => setTimeout(r, 150));
    }

    setItems(loadedItems);
    setProcessing(false);
  };

  // Extract specs using AI
  const extractSpecs = async () => {
    if (items.length === 0) return;

    setExtracting(true);
    const updatedItems = [...items];

    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      setProgress({ current: i + 1, total: items.length, phase: 'Extracting specs with AI...' });

      try {
        const response = await fetch('/api/ai/extract-specs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title,
            description: item.longdescription,
            brand: item.brand,
            categoryId: item.ebaycatid
          })
        });

        const data = await response.json();
        
        if (data.success && data.extracted) {
          updatedItems[i] = {
            ...item,
            extracted: data.extracted,
            status: 'extracted'
          };
        } else {
          updatedItems[i] = {
            ...item,
            status: 'error',
            error: data.error
          };
        }
      } catch (err) {
        updatedItems[i] = {
          ...item,
          status: 'error',
          error: err.message
        };
      }

      setItems([...updatedItems]);
      await new Promise(r => setTimeout(r, 500)); // Rate limit AI calls
    }

    setExtracting(false);
  };

  // Update a field value
  const updateField = (index, field, value) => {
    const updatedItems = [...items];
    if (!updatedItems[index].edited) {
      updatedItems[index].edited = {};
    }
    updatedItems[index].edited[field] = value;
    updatedItems[index].status = 'reviewed';
    setItems(updatedItems);
  };

  // Accept all AI suggestions for an item
  const acceptAll = (index) => {
    const item = items[index];
    if (!item.extracted) return;

    const updatedItems = [...items];
    updatedItems[index].edited = { ...item.extracted };
    updatedItems[index].status = 'reviewed';
    setItems(updatedItems);
  };

  // Push changes to SureDone
  const pushToSureDone = async () => {
    const reviewedItems = items.filter(i => i.status === 'reviewed' && Object.keys(i.edited || {}).length > 0);
    if (reviewedItems.length === 0) {
      alert('No reviewed items to push. Accept AI suggestions or edit fields first.');
      return;
    }

    setPushing(true);
    setProgress({ current: 0, total: reviewedItems.length, phase: 'Pushing to SureDone...' });

    for (let i = 0; i < reviewedItems.length; i++) {
      const item = reviewedItems[i];
      setProgress({ current: i + 1, total: reviewedItems.length, phase: 'Pushing to SureDone...' });

      try {
        // Build update payload - map extracted fields to SureDone fields
        const updateData = {
          guid: item.sku || item.guid
        };

        const fieldMap = {
          'Brand': 'brand',
          'MPN': 'mpn',
          'Model': 'model',
          'Voltage': 'voltage',
          'Current': 'current',
          'Type': 'usertype',
          'Controller Platform': 'controllerplatform',
          'Bore': 'bore',
          'Stroke': 'stroke'
        };

        for (const [aiField, value] of Object.entries(item.edited)) {
          if (value && value !== 'null' && fieldMap[aiField]) {
            updateData[fieldMap[aiField]] = value;
          }
        }

        // Call SureDone update API
        const response = await fetch('/api/suredone/update-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });

        const data = await response.json();
        
        // Update item status
        const itemIndex = items.findIndex(i => i.sku === item.sku);
        if (itemIndex >= 0) {
          const updatedItems = [...items];
          updatedItems[itemIndex].status = data.success ? 'pushed' : 'error';
          updatedItems[itemIndex].pushResult = data;
          setItems(updatedItems);
        }
      } catch (err) {
        console.error(`Error pushing ${item.sku}:`, err);
      }

      await new Promise(r => setTimeout(r, 300));
    }

    setPushing(false);
  };

  // Export results as CSV
  const exportCSV = () => {
    const headers = ['SKU', 'Title', 'Status', 'Brand', 'MPN', 'Model', 'Type', 'Voltage'];
    const rows = items.map(item => {
      const specs = item.edited || item.extracted || {};
      return [
        item.sku,
        `"${(item.title || '').replace(/"/g, '""')}"`,
        item.status,
        specs.Brand || item.brand || '',
        specs.MPN || item.mpn || '',
        specs.Model || item.model || '',
        specs.Type || item.usertype || '',
        specs.Voltage || item.voltage || ''
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-autofix-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const stats = {
    total: items.length,
    loaded: items.filter(i => i.status === 'loaded').length,
    extracted: items.filter(i => i.status === 'extracted').length,
    reviewed: items.filter(i => i.status === 'reviewed').length,
    pushed: items.filter(i => i.status === 'pushed').length
  };

  const isWorking = processing || extracting || pushing;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🤖 AI Auto-Fix</h1>
        <p style={styles.subtitle}>
          Use AI to extract specs from titles and auto-populate missing eBay fields
        </p>
      </div>

      {/* Input Section */}
      <div style={styles.inputSection}>
        <label style={{ fontWeight: '500', marginBottom: '10px', display: 'block' }}>
          Enter SKUs to fix (one per line):
        </label>
        <textarea
          style={styles.textarea}
          value={skuInput}
          onChange={(e) => setSkuInput(e.target.value)}
          placeholder="IP6388&#10;IP6389&#10;IP6390"
          disabled={isWorking}
        />
        
        <div style={styles.buttonRow}>
          <button
            style={styles.button}
            onClick={fetchItems}
            disabled={isWorking || !skuInput.trim()}
          >
            {processing ? '⏳ Loading...' : '1️⃣ Load Items'}
          </button>
          
          <button
            style={styles.buttonOrange}
            onClick={extractSpecs}
            disabled={isWorking || items.length === 0}
          >
            {extracting ? '🧠 Extracting...' : '2️⃣ Extract with AI'}
          </button>
          
          <button
            style={styles.buttonGreen}
            onClick={pushToSureDone}
            disabled={isWorking || stats.reviewed === 0}
          >
            {pushing ? '📤 Pushing...' : `3️⃣ Push to SureDone (${stats.reviewed})`}
          </button>

          {items.length > 0 && (
            <button style={styles.buttonSecondary} onClick={exportCSV}>
              📥 Export
            </button>
          )}
        </div>

        {isWorking && (
          <>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${(progress.current / progress.total) * 100}%` }} />
            </div>
            <p style={{ marginTop: '10px', color: '#6b7280', fontSize: '14px' }}>
              {progress.phase} ({progress.current}/{progress.total})
            </p>
          </>
        )}
      </div>

      {/* Stats */}
      {items.length > 0 && (
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statNumber, color: '#1f2937' }}>{stats.total}</div>
            <div style={styles.statLabel}>Total</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statNumber, color: '#6b7280' }}>{stats.loaded}</div>
            <div style={styles.statLabel}>Loaded</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statNumber, color: '#ea580c' }}>{stats.extracted}</div>
            <div style={styles.statLabel}>AI Extracted</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statNumber, color: '#2563eb' }}>{stats.reviewed}</div>
            <div style={styles.statLabel}>Reviewed</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statNumber, color: '#16a34a' }}>{stats.pushed}</div>
            <div style={styles.statLabel}>Pushed</div>
          </div>
        </div>
      )}

      {/* Item Cards */}
      {items.map((item, index) => (
        <div key={item.sku} style={styles.itemCard}>
          <div style={styles.itemHeader}>
            <div>
              <strong style={{ fontSize: '16px' }}>{item.sku}</strong>
              <span style={{ marginLeft: '15px', color: '#6b7280' }}>
                {item.title?.substring(0, 60)}...
              </span>
            </div>
            <span style={{
              ...styles.badge,
              ...(item.status === 'pushed' ? styles.badgeReviewed :
                  item.status === 'reviewed' ? styles.badgeNew :
                  item.status === 'extracted' ? styles.badgePending :
                  { backgroundColor: '#f3f4f6', color: '#6b7280' })
            }}>
              {item.status === 'pushed' ? '✓ Pushed' :
               item.status === 'reviewed' ? '✓ Reviewed' :
               item.status === 'extracted' ? 'AI Extracted' :
               item.status === 'error' ? '✗ Error' : 'Loaded'}
            </span>
          </div>
          
          <div style={styles.itemBody}>
            {/* Original Data */}
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#6b7280', fontSize: '14px' }}>
                Current Data:
              </h4>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '14px' }}>
                <span><strong>Brand:</strong> {item.brand || <em style={{ color: '#9ca3af' }}>empty</em>}</span>
                <span><strong>MPN:</strong> {item.mpn || item.model || <em style={{ color: '#9ca3af' }}>empty</em>}</span>
                <span><strong>Type:</strong> {item.usertype || <em style={{ color: '#9ca3af' }}>empty</em>}</span>
                <span><strong>Category:</strong> {item.ebaycatid || <em style={{ color: '#9ca3af' }}>empty</em>}</span>
              </div>
            </div>

            {/* AI Extracted Data */}
            {item.extracted && (
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#ea580c', fontSize: '14px' }}>
                  🤖 AI Extracted:
                </h4>
                <div style={styles.specsGrid}>
                  {Object.entries(item.extracted).filter(([key]) => key !== 'confidence' && key !== 'error').map(([field, value]) => (
                    <div key={field} style={styles.specField}>
                      <label style={styles.specLabel}>{field}</label>
                      <input
                        type="text"
                        style={styles.specInput}
                        value={item.edited?.[field] ?? value ?? ''}
                        onChange={(e) => updateField(index, field, e.target.value)}
                        placeholder={value || 'Not found'}
                      />
                    </div>
                  ))}
                </div>
                
                <div style={styles.actionButtons}>
                  <button
                    style={{ ...styles.smallButton, backgroundColor: '#16a34a', color: 'white' }}
                    onClick={() => acceptAll(index)}
                  >
                    ✓ Accept All AI Suggestions
                  </button>
                  <button
                    style={{ ...styles.smallButton, backgroundColor: '#e5e7eb', color: '#374151' }}
                    onClick={() => {
                      const updatedItems = [...items];
                      updatedItems[index].edited = {};
                      updatedItems[index].status = 'extracted';
                      setItems(updatedItems);
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {item.error && (
              <div style={{ color: '#dc2626', marginTop: '10px' }}>
                Error: {item.error}
              </div>
            )}
          </div>
        </div>
      ))}

      {items.length === 0 && !isWorking && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
          <p style={{ fontSize: '48px', marginBottom: '20px' }}>🤖</p>
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>AI Auto-Fix</p>
          <p>Enter SKUs above, then:</p>
          <p>1️⃣ Load Items → 2️⃣ Extract with AI → 3️⃣ Review & Push</p>
        </div>
      )}
    </div>
  );
}
