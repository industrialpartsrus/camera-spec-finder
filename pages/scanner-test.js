// pages/scanner-test.js
// Diagnostic tool to test SureDone lookups

import React, { useState } from 'react';

export default function ScannerTest() {
  const [sku, setSku] = useState('IP15911');
  const [partNumber, setPartNumber] = useState('856T-BAC3C');
  const [brand, setBrand] = useState('Allen Bradley');
  const [results, setResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResults(null);

    try {
      const response = await fetch('/api/scanner/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, partNumber, brand })
      });

      const data = await response.json();
      setResults(data);
      console.log('Diagnostic results:', data);
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    }

    setIsRunning(false);
  };

  const testCases = [
    { sku: 'IP15911', partNumber: '856T-BAC3C', brand: 'Allen Bradley', name: 'Stack Light' },
    { sku: 'IP13385', partNumber: '45PVA-1LEB4-F4', brand: 'Allen Bradley', name: 'Photoelectric Sensor' },
    { sku: 'IP489601007', partNumber: 'A1SJ61BT11', brand: 'Mitsubishi', name: 'PLC (Working)' }
  ];

  const loadTestCase = (testCase) => {
    setSku(testCase.sku);
    setPartNumber(testCase.partNumber);
    setBrand(testCase.brand);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Scanner Lookup Diagnostic</h1>

        {/* Test Cases */}
        <div className="bg-white rounded-lg p-4 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Quick Test Cases</h2>
          <div className="space-y-2">
            {testCases.map((tc, idx) => (
              <button
                key={idx}
                onClick={() => loadTestCase(tc)}
                className="w-full text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                <div className="font-semibold">{tc.name}</div>
                <div className="text-sm text-gray-600">
                  SKU: {tc.sku} | Part: {tc.partNumber} | Brand: {tc.brand}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">SKU (for direct lookup)</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="IP15911"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Part Number</label>
              <input
                type="text"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="856T-BAC3C"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Allen Bradley"
              />
            </div>
            <button
              onClick={runDiagnostic}
              disabled={isRunning}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50"
            >
              {isRunning ? 'Running Diagnostic...' : 'Run Diagnostic'}
            </button>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Results</h2>

            {/* Direct Lookup */}
            {results.directLookup && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Direct Lookup (by SKU)</h3>
                {results.directLookup.found ? (
                  <div className="bg-green-50 border border-green-300 rounded-lg p-4">
                    <div className="font-bold text-green-900 mb-2">✓ FOUND</div>
                    <div className="space-y-1 text-sm">
                      <div><span className="font-semibold">SKU:</span> {results.directLookup.sku}</div>
                      <div><span className="font-semibold">GUID:</span> {results.directLookup.guid}</div>
                      <div><span className="font-semibold">Brand:</span> {results.directLookup.brand}</div>
                      <div><span className="font-semibold">MPN:</span> {results.directLookup.mpn}</div>
                      <div><span className="font-semibold">Model:</span> {results.directLookup.model}</div>
                      <div><span className="font-semibold">Partnumber:</span> {results.directLookup.partnumber}</div>
                      <div><span className="font-semibold">Title:</span> {results.directLookup.title}</div>
                      <div><span className="font-semibold">Shelf:</span> {results.directLookup.shelf}</div>
                      <div><span className="font-semibold">Stock:</span> {results.directLookup.stock}</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                    <div className="font-bold text-red-900">✗ NOT FOUND</div>
                    {results.directLookup.error && (
                      <div className="text-sm text-red-700 mt-1">{results.directLookup.error}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Search Strategies */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Search Strategies</h3>
              <div className="space-y-2">
                {results.searchStrategies.map((strategy, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-lg p-3 ${
                      strategy.found
                        ? 'bg-green-50 border-green-300'
                        : 'bg-gray-50 border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">
                        {strategy.found ? '✓' : '✗'} {strategy.name}
                      </span>
                      <span className="text-sm text-gray-600">
                        {strategy.resultCount} result{strategy.resultCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      Query: <code className="bg-gray-200 px-1 py-0.5 rounded">{strategy.query}</code>
                    </div>
                    {strategy.error && (
                      <div className="text-xs text-red-600 mb-2">Error: {strategy.error}</div>
                    )}
                    {strategy.results && strategy.results.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {strategy.results.map((result, ridx) => (
                          <div key={ridx} className="bg-white border border-gray-200 rounded p-2 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                              <div><span className="font-semibold">SKU:</span> {result.sku}</div>
                              <div><span className="font-semibold">Brand:</span> {result.brand}</div>
                              <div><span className="font-semibold">MPN:</span> {result.mpn}</div>
                              <div><span className="font-semibold">Model:</span> {result.model}</div>
                              <div className="col-span-2"><span className="font-semibold">Title:</span> {result.title}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
