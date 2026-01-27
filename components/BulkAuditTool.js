import React, { useState, useCallback } from 'react';

/**
 * BulkAuditTool Component
 * 
 * Scans multiple SKUs against eBay category requirements
 * and identifies listings that need improvement.
 */

const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '1400px',
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
  uploadSection: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    border: '2px dashed #d1d5db'
  },
  textarea: {
    width: '100%',
    minHeight: '120px',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'monospace',
    resize: 'vertical'
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
    fontWeight: '500',
    fontSize: '14px'
  },
  buttonGreen: {
    padding: '10px 20px',
    backgroundColor: '#16a34a',
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
    fontSize: '14px'
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
  resultsTable: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '100px 1fr 120px 100px 80px 150px',
    padding: '12px 15px',
    backgroundColor: '#f3f4f6',
    fontWeight: '600',
    fontSize: '14px',
    borderBottom: '1px solid #e5e7eb'
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '100px 1fr 120px 100px 80px 150px',
    padding: '12px 15px',
    borderBottom: '1px solid #f3f4f6',
    alignItems: 'center',
    fontSize: '14px'
  },
  tableRowError: {
    backgroundColor: '#fef2f2'
  },
  tableRowWarning: {
    backgroundColor: '#fffbeb'
  },
  tableRowGood: {
    backgroundColor: '#f0fdf4'
  },
  scoreBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontWeight: '600',
    fontSize: '13px',
    display: 'inline-block'
  },
  missingFields: {
    fontSize: '12px',
    color: '#dc2626'
  },
  filterRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px',
    alignItems: 'center'
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
    border: '1px solid #2563eb',
    borderRadius: '6px',
    backgroundColor: '#dbeafe',
    color: '#2563eb',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
  }
};

// Calculate score based on filled fields
function calculateScore(item, aspects) {
  if (!aspects) return { score: 0, missing: [], filled: [] };
  
  let maxPoints = 0;
  let earnedPoints = 0;
  const missing = [];
  const filled = [];
  
  // Check recommended fields (most important for SEO)
  aspects.recommended?.forEach(aspect => {
    maxPoints += 15;
    const fieldName = aspect.name.toLowerCase().replace(/\s+/g, '');
    const value = item[fieldName] || item[aspect.name] || item.brand || '';
    
    // Special handling for common fields
    let hasValue = false;
    if (aspect.name === 'Brand') {
      hasValue = !!(item.brand || item.manufacturer);
    } else if (aspect.name === 'MPN') {
      hasValue = !!(item.mpn || item.model || item.partnumber);
    } else if (aspect.name === 'Model') {
      hasValue = !!(item.model || item.mpn);
    } else {
      hasValue = !!value;
    }
    
    if (hasValue) {
      earnedPoints += 15;
      filled.push(aspect.name);
    } else {
      missing.push(aspect.name);
    }
  });
  
  const score = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 100;
  return { score, missing, filled };
}

function getScoreColor(score) {
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#d97706';
  return '#dc2626';
}

function getRowStyle(score) {
  if (score >= 80) return styles.tableRowGood;
  if (score >= 60) return styles.tableRowWarning;
  return styles.tableRowError;
}

export default function BulkAuditTool({ categoryAspects = null }) {
  const [skuInput, setSkuInput] = useState('');
  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [filter, setFilter] = useState('all'); // all, poor, fair, good
  const [error, setError] = useState(null);

  // Parse SKUs from input (comma, newline, or space separated)
  const parseSkus = (input) => {
    return input
      .split(/[\n,\s]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  // Fetch single item from SureDone
  const fetchItem = async (sku) => {
    try {
      const response = await fetch(`/api/suredone/get-item?sku=${encodeURIComponent(sku)}`);
      const data = await response.json();
      if (data.success && data.item) {
        return data.item;
      }
      return null;
    } catch (err) {
      console.error(`Error fetching ${sku}:`, err);
      return null;
    }
  };

  // Fetch category aspects
  const fetchCategoryAspects = async (categoryId) => {
    // Check local cache first
    if (categoryAspects?.categories?.[categoryId]?.aspects) {
      return categoryAspects.categories[categoryId].aspects;
    }
    
    // Fetch from API
    try {
      const response = await fetch(`/api/ebay/get-category-aspects?categoryId=${categoryId}`);
      const data = await response.json();
      if (data.success) {
        return {
          required: data.required || [],
          recommended: data.recommended || [],
          optional: data.optional || []
        };
      }
    } catch (err) {
      console.error(`Error fetching aspects for category ${categoryId}:`, err);
    }
    return null;
  };

  // Run bulk audit
  const runAudit = async () => {
    const skus = parseSkus(skuInput);
    if (skus.length === 0) {
      setError('Please enter at least one SKU');
      return;
    }

    setProcessing(true);
    setError(null);
    setResults([]);
    setProgress({ current: 0, total: skus.length });

    const auditResults = [];
    const categoryCache = {};

    for (let i = 0; i < skus.length; i++) {
      const sku = skus[i];
      setProgress({ current: i + 1, total: skus.length });

      // Fetch item from SureDone
      const item = await fetchItem(sku);
      
      if (!item) {
        auditResults.push({
          sku,
          error: 'Not found in SureDone',
          score: 0,
          missing: [],
          filled: []
        });
        continue;
      }

      // Get category aspects (with caching)
      let aspects = null;
      if (item.ebaycatid) {
        if (categoryCache[item.ebaycatid]) {
          aspects = categoryCache[item.ebaycatid];
        } else {
          aspects = await fetchCategoryAspects(item.ebaycatid);
          categoryCache[item.ebaycatid] = aspects;
        }
      }

      // Calculate score
      const { score, missing, filled } = calculateScore(item, aspects);

      auditResults.push({
        sku,
        title: item.title || 'No Title',
        brand: item.brand || item.manufacturer || '',
        categoryId: item.ebaycatid || '',
        price: item.price || '0.00',
        stock: item.stock || '0',
        score,
        missing,
        filled,
        item
      });

      // Small delay to avoid overwhelming the API
      if (i < skus.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    setResults(auditResults);
    setProcessing(false);
  };

  // Export results as CSV
  const exportCSV = () => {
    const headers = ['SKU', 'Title', 'Brand', 'Category', 'Price', 'Stock', 'Score', 'Missing Fields'];
    const rows = filteredResults.map(r => [
      r.sku,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      r.brand,
      r.categoryId,
      r.price,
      r.stock,
      r.score,
      `"${r.missing.join(', ')}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `listing-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Filter results
  const filteredResults = results.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'poor') return r.score < 60;
    if (filter === 'fair') return r.score >= 60 && r.score < 80;
    if (filter === 'good') return r.score >= 80;
    return true;
  });

  // Calculate stats
  const stats = {
    total: results.length,
    poor: results.filter(r => r.score < 60).length,
    fair: results.filter(r => r.score >= 60 && r.score < 80).length,
    good: results.filter(r => r.score >= 80).length,
    avgScore: results.length > 0 
      ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
      : 0
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Bulk Listing Audit</h1>
      </div>

      {/* Input Section */}
      <div style={styles.uploadSection}>
        <label style={{ fontWeight: '500', marginBottom: '10px', display: 'block' }}>
          Enter SKUs (one per line, or comma/space separated):
        </label>
        <textarea
          style={styles.textarea}
          value={skuInput}
          onChange={(e) => setSkuInput(e.target.value)}
          placeholder="IP13622&#10;IP13623&#10;IP13624&#10;...or paste from Excel"
          disabled={processing}
        />
        
        <div style={styles.buttonRow}>
          <button
            style={styles.button}
            onClick={runAudit}
            disabled={processing || !skuInput.trim()}
          >
            {processing ? `Processing ${progress.current}/${progress.total}...` : '🔍 Run Audit'}
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
              setProgress({ current: 0, total: 0 });
            }}
            disabled={processing}
          >
            Clear
          </button>
          
          <span style={{ color: '#6b7280', fontSize: '14px' }}>
            {parseSkus(skuInput).length} SKUs detected
          </span>
        </div>

        {processing && (
          <div style={styles.progressBar}>
            <div 
              style={{ 
                ...styles.progressFill, 
                width: `${(progress.current / progress.total) * 100}%` 
              }} 
            />
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '15px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Stats */}
      {results.length > 0 && (
        <>
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#1f2937' }}>{stats.total}</div>
              <div style={styles.statLabel}>Total Scanned</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#dc2626' }}>{stats.poor}</div>
              <div style={styles.statLabel}>Need Work (&lt;60)</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#d97706' }}>{stats.fair}</div>
              <div style={styles.statLabel}>Fair (60-79)</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#16a34a' }}>{stats.good}</div>
              <div style={styles.statLabel}>Good (80+)</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#2563eb' }}>{stats.avgScore}</div>
              <div style={styles.statLabel}>Avg Score</div>
            </div>
          </div>

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
              style={filter === 'poor' ? styles.filterButtonActive : styles.filterButton}
              onClick={() => setFilter('poor')}
            >
              🔴 Poor ({stats.poor})
            </button>
            <button
              style={filter === 'fair' ? styles.filterButtonActive : styles.filterButton}
              onClick={() => setFilter('fair')}
            >
              🟡 Fair ({stats.fair})
            </button>
            <button
              style={filter === 'good' ? styles.filterButtonActive : styles.filterButton}
              onClick={() => setFilter('good')}
            >
              🟢 Good ({stats.good})
            </button>
          </div>

          {/* Results Table */}
          <div style={styles.resultsTable}>
            <div style={styles.tableHeader}>
              <div>SKU</div>
              <div>Title</div>
              <div>Category</div>
              <div>Price</div>
              <div>Score</div>
              <div>Missing Fields</div>
            </div>
            
            {filteredResults.map((result, idx) => (
              <div 
                key={idx} 
                style={{ ...styles.tableRow, ...getRowStyle(result.score) }}
              >
                <div style={{ fontWeight: '500' }}>{result.sku}</div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {result.error || result.title}
                </div>
                <div>{result.categoryId || '-'}</div>
                <div>${result.price}</div>
                <div>
                  <span style={{
                    ...styles.scoreBadge,
                    backgroundColor: result.error ? '#fee2e2' : `${getScoreColor(result.score)}20`,
                    color: result.error ? '#dc2626' : getScoreColor(result.score)
                  }}>
                    {result.error ? 'ERR' : result.score}
                  </span>
                </div>
                <div style={styles.missingFields}>
                  {result.missing.slice(0, 3).join(', ')}
                  {result.missing.length > 3 && ` +${result.missing.length - 3} more`}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {results.length === 0 && !processing && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <p>Enter SKUs above and click "Run Audit" to scan your listings.</p>
          <p style={{ fontSize: '14px' }}>Tip: You can paste a column of SKUs directly from Excel!</p>
        </div>
      )}
    </div>
  );
}
