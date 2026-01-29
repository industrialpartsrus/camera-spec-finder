// components/ExistingListingPanel.js
// Side panel showing existing SureDone listing data for comparison

import React, { useState, useEffect } from 'react';
import { X, RefreshCw, ArrowRight, Check } from 'lucide-react';

/**
 * ExistingListingPanel - Shows existing listing data from SureDone
 * for side-by-side comparison with AI suggestions
 */
export default function ExistingListingPanel({ 
  sku, 
  isOpen, 
  onClose, 
  onUseValue,
  onUseAllValues,
  currentData = {}
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [existingData, setExistingData] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('existing'); // For mobile toggle

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch existing listing when SKU changes
  useEffect(() => {
    if (sku && isOpen) {
      fetchExistingListing(sku);
    }
  }, [sku, isOpen]);

  const fetchExistingListing = async (skuToFetch) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/suredone/get-item?sku=${encodeURIComponent(skuToFetch)}`);
      const data = await response.json();
      
      if (data.success && data.item) {
        setExistingData(data.item);
      } else {
        setError('SKU not found in SureDone');
        setExistingData(null);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
      setExistingData(null);
    }
    
    setLoading(false);
  };

  // Field mapping for display
  const fieldGroups = [
    {
      title: 'Basic Info',
      fields: [
        { key: 'title', label: 'Title' },
        { key: 'brand', label: 'Brand' },
        { key: 'mpn', label: 'MPN' },
        { key: 'model', label: 'Model' }
      ]
    },
    {
      title: 'Categories',
      fields: [
        { key: 'ebaycatid', label: 'eBay Category ID' },
        { key: 'ebaystoreid', label: 'eBay Store Cat 1' },
        { key: 'ebaystoreid2', label: 'eBay Store Cat 2' },
        { key: 'bigcommercecategories', label: 'BigCommerce Categories' }
      ]
    },
    {
      title: 'Pricing & Stock',
      fields: [
        { key: 'price', label: 'Price' },
        { key: 'stock', label: 'Stock' },
        { key: 'condition', label: 'Condition' }
      ]
    },
    {
      title: 'Specifications',
      fields: [
        { key: 'voltage', label: 'Voltage' },
        { key: 'inputvoltage', label: 'Input Voltage' },
        { key: 'outputvoltage', label: 'Output Voltage' },
        { key: 'current', label: 'Current' },
        { key: 'horsepower', label: 'Horsepower' },
        { key: 'kw', label: 'kW' },
        { key: 'rpm', label: 'RPM' },
        { key: 'controllerplatform', label: 'Controller Platform' },
        { key: 'usertype', label: 'Product Type' },
        { key: 'bore', label: 'Bore' },
        { key: 'stroke', label: 'Stroke' },
        { key: 'portsize', label: 'Port Size' }
      ]
    },
    {
      title: 'Shipping',
      fields: [
        { key: 'weight', label: 'Weight' },
        { key: 'boxlength', label: 'Box Length' },
        { key: 'boxwidth', label: 'Box Width' },
        { key: 'boxheight', label: 'Box Height' },
        { key: 'shelf', label: 'Shelf Location' }
      ]
    }
  ];

  // Compare values and determine if different
  const isDifferent = (fieldKey) => {
    const existingVal = existingData?.[fieldKey] || '';
    const currentVal = currentData?.[fieldKey] || '';
    return existingVal.toString().toLowerCase() !== currentVal.toString().toLowerCase();
  };

  // Render a comparison row
  const renderComparisonRow = (field) => {
    const existingVal = existingData?.[field.key] || '';
    const currentVal = currentData?.[field.key] || '';
    const different = isDifferent(field.key);

    return (
      <div 
        key={field.key} 
        className={`grid grid-cols-3 gap-2 py-2 px-3 border-b border-gray-100 ${different ? 'bg-yellow-50' : ''}`}
      >
        <div className="text-xs font-medium text-gray-600">{field.label}</div>
        <div className="text-xs">
          {existingVal || <span className="text-gray-400 italic">empty</span>}
        </div>
        <div className="text-xs flex items-center gap-1">
          {currentVal || <span className="text-gray-400 italic">empty</span>}
          {different && existingVal && (
            <button
              onClick={() => onUseValue && onUseValue(field.key, existingVal)}
              className="ml-auto text-blue-600 hover:text-blue-800 p-1"
              title="Use existing value"
            >
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // Mobile view with tabs
  if (isMobile && isOpen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
            <div>
              <h3 className="font-bold">Compare: {sku}</h3>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setActiveTab('existing')}
                  className={`px-3 py-1 text-sm rounded-full ${activeTab === 'existing' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                >
                  Existing
                </button>
                <button
                  onClick={() => setActiveTab('new')}
                  className={`px-3 py-1 text-sm rounded-full ${activeTab === 'new' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
                >
                  New/AI
                </button>
              </div>
            </div>
            <button onClick={onClose} className="p-2">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(80vh - 80px)' }}>
            {loading && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2">Loading...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                {error}
              </div>
            )}

            {existingData && !loading && (
              <div className="space-y-4">
                {fieldGroups.map(group => (
                  <div key={group.title} className="bg-gray-50 rounded-lg overflow-hidden">
                    <h4 className="font-semibold text-sm bg-gray-200 px-3 py-2">{group.title}</h4>
                    {group.fields.map(field => {
                      const val = activeTab === 'existing' 
                        ? existingData[field.key] 
                        : currentData[field.key];
                      return (
                        <div key={field.key} className="flex justify-between px-3 py-2 border-b border-gray-100">
                          <span className="text-xs text-gray-600">{field.label}</span>
                          <span className="text-xs font-medium">
                            {val || <span className="text-gray-400 italic">empty</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop side panel
  if (!isOpen) return null;

  return (
    <div className="w-96 bg-white border-l shadow-lg overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold">Existing Listing</h3>
            <p className="text-sm text-blue-100">{sku}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchExistingListing(sku)}
              className="p-2 hover:bg-blue-500 rounded"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-blue-500 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 bg-gray-50 border-b text-xs flex items-center gap-4">
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-200 rounded"></div>
          Different
        </span>
        <button 
          onClick={() => onUseAllValues && onUseAllValues(existingData)}
          className="ml-auto text-blue-600 hover:text-blue-800 text-xs font-medium"
        >
          Use All Existing →
        </button>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-2 px-3 py-2 bg-gray-100 text-xs font-semibold text-gray-600 border-b">
        <div>Field</div>
        <div>Existing</div>
        <div>New/AI</div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading existing listing...</span>
          </div>
        )}

        {error && (
          <div className="m-4 p-4 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {existingData && !loading && (
          <div>
            {fieldGroups.map(group => (
              <div key={group.title}>
                <div className="px-3 py-2 bg-gray-50 font-semibold text-xs text-gray-700 border-b border-t">
                  {group.title}
                </div>
                {group.fields.map(field => renderComparisonRow(field))}
              </div>
            ))}
          </div>
        )}

        {!existingData && !loading && !error && (
          <div className="p-8 text-center text-gray-500">
            <p>Enter a SKU to load existing listing data</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {existingData && (
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={() => onUseAllValues && onUseAllValues(existingData)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Keep All Existing Values
          </button>
        </div>
      )}
    </div>
  );
}
