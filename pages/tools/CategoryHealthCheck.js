import React, { useState, useCallback } from 'react';

/**
 * CategoryHealthCheck Component
 * 
 * Scans listings for invalid/outdated eBay category IDs
 */

const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '1200px',
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
    gridTemplateColumns: 'repeat(4, 1fr)',
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
  resultsTable: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '100px 1fr 120px 100px 200px',
    padding: '12px 15px',
    backgroundColor: '#f3f4f6',
    fontWeight: '600',
    fontSize: '14px',
    borderBottom: '1px solid #e5e7eb'
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '100px 1fr 120px 100px 200px',
    padding: '12px 15px',
    borderBottom: '1px solid #f3f4f6',
    alignItems: 'center',
    fontSize: '14px'
  },
  tableRowInvalid: {
    backgroundColor: '#fef2f2'
  },
  tableRowValid: {
    backgroundColor: '#f0fdf4'
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  },
  badgeValid: {
    backgroundColor: '#dcfce7',
    color: '#16a34a'
  },
  badgeInvalid: {
    backgroundColor: '#fee2e2',
    color: '#dc2626'
  },
  filterRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px'
  },
  filterButton: {
    padding: '6px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '13px'
  },
  filterButtonActive: {
    padding: '6px 12px',
    border: '1px solid #dc2626',
    borderRadius: '6px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
  }
};

// Known valid category mappings for common invalid ones
const CATEGORY_SUGGESTIONS = {
  '67010': { suggestion: '181714', name: 'Try: I/O Modules or search eBay for current Pneumatic Cylinder category' },
  '67011': { suggestion: '181714', name: 'Try: Search eBay for current Pneumatic Valve category' },
  '57011': { suggestion: '181714', name: 'Try: Search eBay for current Hydraulic Valve category' },
  '66981': { suggestion: '78192', name: 'Try: 78192 (AC Drives/VFDs)' },
  '181938': { suggestion: '181720', name: 'Try: Search eBay for current Transformer category' },
  '181831': { suggestion: '260823', name: 'Try: 260823 (Fuses & Accessories)' },
  '181836': { suggestion: '260823', name: 'Try: 260823 (Fuses & Accessories)' },
  '181693': { suggestion: '65464', name: 'Try: 65464 (Safety Relays) or search for Timing Relay' },
  '50928': { suggestion: '184027', name: 'Try: 184027 (Pneumatic Fittings)' }
};

export default function CategoryHealthCheck() {
  const [skuInput, setSkuInput] = useState('');
  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [filter, setFilter] = useState('all');
  const [checkedCategories, setCheckedCategories] = useState({});

  const parseSkus = (input) => {
    return input
      .split(/[\n,\s]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  const fetchItem = async (sku) => {
    try {
      const response = await fetch(`/api/suredone/get-item?sku=${encodeURIComponent(sku)}`);
      const data = await response.json();
      return data.success ? data.item : null;
    } catch (err) {
      return null;
    }
  };

  const checkCategory = async (categoryId) => {
    // Return cached result if we already checked this category
    if (checkedCategories[categoryId] !== undefined) {
      return checkedCategories[categoryId];
    }

    try {
      const response = await fetch(`/api/ebay/check-category?categoryId=${categoryId}`);
      const data = await response.json();
      const isValid = data.valid === true;
      
      setCheckedCategories(prev => ({ ...prev, [categoryId]: isValid }));
      return isValid;
    } catch (err) {
      return false;
    }
  };

  const runHealthCheck = async () => {
    const skus = parseSkus(skuInput);
    if (skus.length === 0) return;

    setProcessing(true);
    setResults([]);
    setProgress({ current: 0, total: skus.length });

    const checkResults = [];

    for (let i = 0; i < skus.length; i++) {
      const sku = skus[i];
      setProgress({ current: i + 1, total: skus.length });

      const item = await fetchItem(sku);
      
      if (!item) {
        checkResults.push({
          sku,
          error: 'Not found in SureDone',
          valid: null
        });
        continue;
      }

      const categoryId = item.ebaycatid;
      
      if (!categoryId) {
        checkResults.push({
          sku,
          title: item.title,
          categoryId: null,
          valid: false,
          error: 'No eBay category assigned',
          stock: item.stock
        });
        continue;
      }

      const isValid = await checkCategory(categoryId);
      const suggestion = CATEGORY_SUGGESTIONS[categoryId];

      checkResults.push({
        sku,
        title: item.title || 'No Title',
        categoryId,
        valid: isValid,
        stock: item.stock || '0',
        suggestion: !isValid ? suggestion?.name : null
      });

      // Small delay
      await new Promise(r => setTimeout(r, 150));
    }

    setResults(checkResults);
    setProcessing(false);
  };

  const exportCSV = () => {
    const headers = ['SKU', 'Title', 'Category ID', 'Valid', 'Stock', 'Suggestion'];
    const rows = filteredResults.map(r => [
      r.sku,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      r.categoryId || '',
      r.valid === null ? 'ERROR' : r.valid ? 'YES' : 'NO',
      r.stock || '0',
      `"${r.suggestion || ''}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `category-health-check-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredResults = results.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'invalid') return r.valid === false;
    if (filter === 'valid') return r.valid === true;
    return true;
  });

  const stats = {
    total: results.length,
    valid: results.filter(r => r.valid === true).length,
    invalid: results.filter(r => r.valid === false).length,
    errors: results.filter(r => r.valid === null).length
  };

  // Get unique invalid categories
  const invalidCategories = [...new Set(
    results
      .filter(r => r.valid === false && r.categoryId)
      .map(r => r.categoryId)
  )];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🏥 Category Health Check</h1>
        <p style={styles.subtitle}>
          Scan listings for invalid or outdated eBay category IDs
        </p>
      </div>

      <div style={styles.inputSection}>
        <label style={{ fontWeight: '500', marginBottom: '10px', display: 'block' }}>
          Enter SKUs to check (one per line, or comma separated):
        </label>
        <textarea
          style={styles.textarea}
          value={skuInput}
          onChange={(e) => setSkuInput(e.target.value)}
          placeholder="IP6388&#10;IP6389&#10;IP6390"
          disabled={processing}
        />
        
        <div style={styles.buttonRow}>
          <button
            style={styles.button}
            onClick={runHealthCheck}
            disabled={processing || !skuInput.trim()}
          >
            {processing ? `Checking ${progress.current}/${progress.total}...` : '🔍 Check Categories'}
          </button>
          
          {results.length > 0 && (
            <button style={styles.buttonGreen} onClick={exportCSV}>
              📥 Export CSV
            </button>
          )}
          
          <button
            style={styles.buttonSecondary}
            onClick={() => {
              setSkuInput('');
              setResults([]);
            }}
            disabled={processing}
          >
            Clear
          </button>
        </div>

        {processing && (
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${(progress.current / progress.total) * 100}%` }} />
          </div>
        )}
      </div>

      {/* Stats */}
      {results.length > 0 && (
        <>
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#1f2937' }}>{stats.total}</div>
              <div style={styles.statLabel}>Total Checked</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#16a34a' }}>{stats.valid}</div>
              <div style={styles.statLabel}>Valid Categories</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#dc2626' }}>{stats.invalid}</div>
              <div style={styles.statLabel}>Invalid Categories</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#6b7280' }}>{stats.errors}</div>
              <div style={styles.statLabel}>Errors</div>
            </div>
          </div>

          {/* Invalid category summary */}
          {invalidCategories.length > 0 && (
            <div style={{ 
              backgroundColor: '#fef2f2', 
              border: '1px solid #fecaca',
              borderRadius: '8px', 
              padding: '15px', 
              marginBottom: '20px' 
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#dc2626' }}>
                ⚠️ Invalid Category IDs Found:
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {invalidCategories.map(catId => (
                  <span key={catId} style={{
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    {catId}
                    {CATEGORY_SUGGESTIONS[catId] && (
                      <span style={{ fontWeight: '400', marginLeft: '5px' }}>
                        → {CATEGORY_SUGGESTIONS[catId].suggestion}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={styles.filterRow}>
            <span style={{ fontWeight: '500', marginRight: '10px' }}>Filter:</span>
            <button
              style={filter === 'all' ? styles.filterButtonActive : styles.filterButton}
              onClick={() => setFilter('all')}
            >
              All ({stats.total})
            </button>
            <button
              style={filter === 'invalid' ? styles.filterButtonActive : styles.filterButton}
              onClick={() => setFilter('invalid')}
            >
              🔴 Invalid ({stats.invalid})
            </button>
            <button
              style={filter === 'valid' ? { ...styles.filterButton, borderColor: '#16a34a', color: '#16a34a' } : styles.filterButton}
              onClick={() => setFilter('valid')}
            >
              🟢 Valid ({stats.valid})
            </button>
          </div>

          {/* Results Table */}
          <div style={styles.resultsTable}>
            <div style={styles.tableHeader}>
              <div>SKU</div>
              <div>Title</div>
              <div>Category</div>
              <div>Status</div>
              <div>Suggestion</div>
            </div>
            
            {filteredResults.map((result, idx) => (
              <div 
                key={idx} 
                style={{ 
                  ...styles.tableRow, 
                  ...(result.valid === false ? styles.tableRowInvalid : 
                      result.valid === true ? styles.tableRowValid : {})
                }}
              >
                <div style={{ fontWeight: '500' }}>{result.sku}</div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {result.error || result.title}
                </div>
                <div>{result.categoryId || '-'}</div>
                <div>
                  <span style={{
                    ...styles.badge,
                    ...(result.valid === true ? styles.badgeValid : 
                        result.valid === false ? styles.badgeInvalid : 
                        { backgroundColor: '#f3f4f6', color: '#6b7280' })
                  }}>
                    {result.valid === null ? 'ERROR' : result.valid ? '✓ Valid' : '✗ Invalid'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#dc2626' }}>
                  {result.suggestion || ''}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {results.length === 0 && !processing && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <p>Enter SKUs above to check their eBay category validity.</p>
          <p style={{ fontSize: '14px' }}>
            This tool identifies listings with outdated category IDs that need to be updated.
          </p>
        </div>
      )}
    </div>
  );
}
