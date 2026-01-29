// components/SkuLookup.js
// SKU lookup input for loading existing listings into Pro Listing Builder

import React, { useState } from 'react';
import { Search, Loader, ExternalLink } from 'lucide-react';

/**
 * SkuLookup - Searches SureDone for an existing listing
 * and returns the data to populate the editor
 */
export default function SkuLookup({ onLoadListing, onCompareClick }) {
  const [sku, setSku] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const searchSku = async () => {
    if (!sku.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch(`/api/suredone/get-item?sku=${encodeURIComponent(sku.trim())}`);
      const data = await response.json();
      
      if (data.success && data.item) {
        setResult(data.item);
      } else {
        setError('SKU not found in SureDone');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    }
    
    setLoading(false);
  };

  const handleLoadIntoEditor = () => {
    if (result && onLoadListing) {
      onLoadListing(result);
      setSku('');
      setResult(null);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 mb-4">
      <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
        <Search className="w-4 h-4" />
        Edit Existing Listing
      </h3>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={sku}
          onChange={(e) => setSku(e.target.value.toUpperCase())}
          onKeyPress={(e) => e.key === 'Enter' && searchSku()}
          placeholder="Enter SKU (e.g., IP6388)"
          className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          onClick={searchSku}
          disabled={loading || !sku.trim()}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2 text-sm"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          {error}
        </div>
      )}

      {/* Result Preview */}
      {result && (
        <div className="mt-3 bg-white border border-amber-200 rounded-lg p-3">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="font-bold text-amber-900">{result.sku || result.guid}</span>
              <span className="ml-2 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                In Stock: {result.stock || 0}
              </span>
            </div>
            <span className="text-sm font-bold text-green-600">${result.price}</span>
          </div>
          
          <p className="text-sm text-gray-700 mb-2 line-clamp-2">{result.title}</p>
          
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
            <div><strong>Brand:</strong> {result.brand || 'N/A'}</div>
            <div><strong>MPN:</strong> {result.mpn || result.model || 'N/A'}</div>
            <div><strong>Category:</strong> {result.ebaycatid || 'N/A'}</div>
            <div><strong>Condition:</strong> {result.condition || 'N/A'}</div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleLoadIntoEditor}
              className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
            >
              Load into Editor
            </button>
            {onCompareClick && (
              <button
                onClick={() => onCompareClick(result.sku || result.guid)}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                title="Open comparison panel"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-amber-700 mt-2">
        💡 Load an existing listing to edit and improve its specifications
      </p>
    </div>
  );
}
