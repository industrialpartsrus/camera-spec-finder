// components/InventoryCheckAlert.js
// React component to display existing inventory matches
// Add this to your pro.js page

import { useState, useEffect } from 'react';

export default function InventoryCheckAlert({ brand, partNumber, onSelectExisting, onCreateNew }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // Check inventory whenever brand or partNumber changes
  useEffect(() => {
    if (partNumber && partNumber.length >= 3) {
      checkInventory();
    } else {
      setResult(null);
    }
  }, [brand, partNumber]);

  const checkInventory = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/check-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, partNumber })
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to check inventory');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything if no search has been done
  if (!result && !loading && !error) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Loading State */}
      {loading && (
        <div style={styles.loadingBox}>
          <span style={styles.spinner}>⏳</span>
          Checking existing inventory...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={styles.errorBox}>
          <strong>⚠️ Error:</strong> {error}
          <button onClick={checkInventory} style={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {/* Results - Matches Found */}
      {result && result.found && (
        <div style={styles.alertBox}>
          <div style={styles.alertHeader}>
            <span style={styles.alertIcon}>🔔</span>
            <strong>EXISTING INVENTORY FOUND!</strong>
            <span style={styles.badge}>{result.totalMatches} match{result.totalMatches > 1 ? 'es' : ''}</span>
          </div>
          
          <p style={styles.alertMessage}>
            We already have <strong>{partNumber}</strong> in stock. 
            Review before creating a duplicate listing.
          </p>

          {/* Toggle to show/hide matches */}
          <button 
            onClick={() => setExpanded(!expanded)} 
            style={styles.expandButton}
          >
            {expanded ? '▼ Hide Details' : '▶ Show Existing Listings'}
          </button>

          {/* Expanded Match List */}
          {expanded && (
            <div style={styles.matchList}>
              {result.matches.map((match, index) => (
                <MatchCard 
                  key={match.sku} 
                  match={match} 
                  onSelect={() => onSelectExisting && onSelectExisting(match)}
                />
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            <button 
              onClick={() => onCreateNew && onCreateNew()} 
              style={styles.createNewButton}
            >
              Create New Listing Anyway
            </button>
          </div>
        </div>
      )}

      {/* Results - No Matches */}
      {result && !result.found && (
        <div style={styles.clearBox}>
          <span style={styles.clearIcon}>✅</span>
          <strong>No existing inventory found</strong>
          <p style={styles.clearMessage}>
            No items matching "{partNumber}" with stock &gt; 0. 
            Safe to create a new listing.
          </p>
        </div>
      )}
    </div>
  );
}

// Individual Match Card Component
function MatchCard({ match, onSelect }) {
  return (
    <div style={styles.matchCard}>
      {/* Thumbnail */}
      <div style={styles.thumbnailContainer}>
        {match.thumbnail ? (
          <img 
            src={match.thumbnail} 
            alt={match.title}
            style={styles.thumbnail}
            onError={(e) => e.target.style.display = 'none'}
          />
        ) : (
          <div style={styles.noImage}>No Image</div>
        )}
      </div>

      {/* Match Details */}
      <div style={styles.matchDetails}>
        <div style={styles.matchTitle}>{match.title}</div>
        
        <div style={styles.matchInfo}>
          <span style={styles.infoItem}>
            <strong>SKU:</strong> {match.sku}
          </span>
          <span style={styles.infoItem}>
            <strong>Condition:</strong> 
            <span style={getConditionStyle(match.condition)}>{match.condition}</span>
          </span>
          <span style={styles.infoItem}>
            <strong>Shelf:</strong> {match.shelf}
          </span>
          <span style={styles.infoItem}>
            <strong>Qty:</strong> {match.stock}
          </span>
          <span style={styles.infoItem}>
            <strong>Price:</strong> ${match.price}
          </span>
          <span style={styles.infoItem}>
            <strong>Images:</strong> {match.imageCount}
          </span>
        </div>

        {/* Quality Warnings */}
        {match.missingFields.length > 0 && (
          <div style={styles.warning}>
            ⚠️ Missing: {match.missingFields.join(', ')}
          </div>
        )}

        {/* Channels */}
        <div style={styles.channels}>
          {match.channels.ebay && <span style={styles.channelBadge}>eBay</span>}
          {match.channels.bigcommerce && <span style={styles.channelBadge}>BigCommerce</span>}
        </div>
      </div>

      {/* Select Button */}
      <div style={styles.matchActions}>
        <button onClick={onSelect} style={styles.selectButton}>
          Update This Listing
        </button>
      </div>
    </div>
  );
}

// Helper function for condition styling
function getConditionStyle(condition) {
  const colors = {
    'New': { backgroundColor: '#22c55e', color: 'white' },
    'New Other': { backgroundColor: '#84cc16', color: 'white' },
    'Manufacturer Refurbished': { backgroundColor: '#3b82f6', color: 'white' },
    'Seller Refurbished': { backgroundColor: '#8b5cf6', color: 'white' },
    'Used': { backgroundColor: '#f59e0b', color: 'white' },
    'For Parts or Not Working': { backgroundColor: '#ef4444', color: 'white' },
  };
  
  return {
    ...styles.conditionBadge,
    ...(colors[condition] || { backgroundColor: '#6b7280', color: 'white' })
  };
}

// Styles
const styles = {
  container: {
    marginBottom: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  
  loadingBox: {
    padding: '15px',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  
  errorBox: {
    padding: '15px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#b91c1c',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  
  retryButton: {
    marginLeft: 'auto',
    padding: '5px 10px',
    backgroundColor: '#b91c1c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  
  alertBox: {
    padding: '20px',
    backgroundColor: '#fffbeb',
    border: '2px solid #f59e0b',
    borderRadius: '8px',
  },
  
  alertHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
    fontSize: '18px',
  },
  
  alertIcon: {
    fontSize: '24px',
  },
  
  badge: {
    backgroundColor: '#f59e0b',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '14px',
    marginLeft: 'auto',
  },
  
  alertMessage: {
    margin: '10px 0',
    color: '#92400e',
  },
  
  expandButton: {
    backgroundColor: 'transparent',
    border: '1px solid #f59e0b',
    color: '#92400e',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '15px',
  },
  
  matchList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginBottom: '15px',
  },
  
  matchCard: {
    display: 'flex',
    gap: '15px',
    padding: '15px',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    alignItems: 'flex-start',
  },
  
  thumbnailContainer: {
    flexShrink: 0,
    width: '80px',
    height: '80px',
  },
  
  thumbnail: {
    width: '80px',
    height: '80px',
    objectFit: 'cover',
    borderRadius: '4px',
  },
  
  noImage: {
    width: '80px',
    height: '80px',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#9ca3af',
  },
  
  matchDetails: {
    flex: 1,
  },
  
  matchTitle: {
    fontWeight: 'bold',
    marginBottom: '8px',
    fontSize: '14px',
  },
  
  matchInfo: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    fontSize: '13px',
    color: '#4b5563',
  },
  
  infoItem: {
    display: 'flex',
    gap: '4px',
  },
  
  conditionBadge: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px',
    marginLeft: '4px',
  },
  
  warning: {
    marginTop: '8px',
    padding: '5px 10px',
    backgroundColor: '#fef3c7',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#92400e',
  },
  
  channels: {
    marginTop: '8px',
    display: 'flex',
    gap: '5px',
  },
  
  channelBadge: {
    padding: '2px 8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#374151',
  },
  
  matchActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  
  selectButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    whiteSpace: 'nowrap',
  },
  
  actionButtons: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
  },
  
  createNewButton: {
    padding: '10px 20px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  
  clearBox: {
    padding: '15px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: '8px',
  },
  
  clearIcon: {
    fontSize: '20px',
    marginRight: '10px',
  },
  
  clearMessage: {
    margin: '5px 0 0 0',
    color: '#166534',
    fontSize: '14px',
  },
};
