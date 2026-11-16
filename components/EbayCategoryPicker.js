// components/EbayCategoryPicker.js
// eBay category picker for pro.js. Categories come only from the live eBay
// Taxonomy API via /api/ebay-category-picker (see lib/ebay-category-picker.js).
//
// Shows the preselected category (remembered choice / existing ID / none), the
// top 5 ranked suggestions with full paths, and a live search box (all of eBay).
// The lister confirms one; the parent saves it on the item (onConfirmed).

import { useEffect, useRef, useState } from 'react';

const SOURCE_LABEL = {
  remembered: 'Remembered for this product type',
  table: 'Existing category ID (still live on eBay)',
  picker: 'eBay suggestion',
  search: 'Search result',
};

export default function EbayCategoryPicker({ item, userName, onConfirmed }) {
  const productType = item.productType || item.productCategory || item.usertype || '';
  const [data, setData] = useState(item.ebayCategoryPicker || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const timer = useRef(null);

  // Picker data comes with detection; items loaded another way fetch it here
  useEffect(() => {
    setData(item.ebayCategoryPicker || null);
    setSelectedId('');
    setQuery('');
    setResults([]);
    setError('');
  }, [item.id, item.ebayCategoryPicker]);

  const load = async () => {
    if (!productType && !item.title) return;
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ productType, title: item.title || '', tableId: item.ebayCategoryId || '' });
      const r = await fetch(`/api/ebay-category-picker?${qs}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setData(d);
    } catch (e) {
      setError(`Could not load eBay categories: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!item.ebayCategoryPicker && !item.ebayCategoryConfirmed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const candidates = data?.candidates || [];
  const current = item.ebayCategoryId || '';
  const effectiveSelected = selectedId || current || data?.categoryId || '';

  const onSearch = (text) => {
    setQuery(text);
    clearTimeout(timer.current);
    if (text.trim().length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ q: text, productType });
        const r = await fetch(`/api/ebay-category-picker?${qs}`);
        const d = await r.json();
        setResults(r.ok ? d.candidates || [] : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const find = (id) => {
    const i = candidates.findIndex(c => c.categoryId === id);
    if (i >= 0) return { cat: candidates[i], source: data?.categoryId === id ? data.source : 'picker', rank: i + 1 };
    const s = results.find(c => c.categoryId === id);
    if (s) return { cat: s, source: 'search', rank: null };
    if (data?.categoryId === id) return { cat: { categoryId: id, name: data.name, path: data.path }, source: data.source, rank: data.rank ?? null };
    return null;
  };

  const confirm = async () => {
    const hit = find(effectiveSelected);
    if (!hit) return;
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/ebay-category-picker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType, categoryId: hit.cat.categoryId, path: hit.cat.path || null, confirmedBy: userName || '' }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.reason || d.error || `HTTP ${r.status}`);
      await onConfirmed({
        categoryId: d.categoryId, name: d.name, path: hit.cat.path || null,
        source: hit.source, rank: hit.rank, productType, count: d.count,
        changed: d.categoryId !== current,
      });
      setQuery('');
      setResults([]);
      setSelectedId('');
    } catch (e) {
      setError(`Not saved: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const confirmed = Boolean(item.ebayCategoryConfirmed && current);
  const pick = item.ebayCategoryPick;

  const Row = ({ c, rank }) => (
    <label className={`flex items-start gap-2 px-3 py-2 border-b last:border-b-0 cursor-pointer text-xs ${effectiveSelected === c.categoryId ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
      <input type="radio" name={`ebaycat-${item.id}`} className="mt-0.5" checked={effectiveSelected === c.categoryId}
        onChange={() => setSelectedId(c.categoryId)} />
      <span className="flex-1">
        <span className="font-semibold text-gray-900">{c.name}</span>
        <span className="text-gray-500 ml-2">({c.categoryId})</span>
        {rank && <span className="ml-2 text-gray-400">#{rank}</span>}
        <span className="block text-gray-500">{c.path}</span>
      </span>
    </label>
  );

  return (
    <div>
      <label className="block text-sm font-semibold mb-2">eBay Category</label>

      {/* Current state */}
      <div className={`px-3 py-2 border rounded-lg text-sm ${confirmed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-300'}`}>
        {current ? (
          <>
            <span className="font-medium">{pick?.name || data?.name || 'Category'}</span>
            <span className="text-gray-500 ml-2">(ID: {current})</span>
            {(pick?.path || data?.path) && <span className="block text-xs text-gray-600">{pick?.path || data?.path}</span>}
          </>
        ) : (
          <span className="text-amber-800 font-medium">No eBay category yet: choose one below</span>
        )}
        <span className={`block text-xs mt-1 font-semibold ${confirmed ? 'text-green-700' : 'text-amber-800'}`}>
          {confirmed
            ? `✓ Confirmed${pick?.confirmedBy ? ` by ${pick.confirmedBy}` : ''}${pick?.source ? ` · ${SOURCE_LABEL[pick.source] || pick.source}` : ''}`
            : current ? '⚠ Needs confirmation before sending' : ''}
        </span>
        {data?.source === 'remembered' && (
          <span className="block text-xs text-gray-600 mt-1">
            Remembered choice: {data.name} · confirmed by {data.confirmedBy || 'unknown'} · {data.count || 0}×
            {data.count < 2 ? ' (confirm once more to preselect it automatically)' : ''}
          </span>
        )}
        {data?.notes?.length > 0 && (
          <span className="block text-xs text-gray-500 mt-1">{data.notes.join('; ')}</span>
        )}
      </div>

      <details className="mt-2" open={!confirmed}>
        <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
          {confirmed ? 'Change category' : 'Choose or confirm a category'}
        </summary>

        {loading && <p className="text-xs text-gray-500 mt-2">Loading eBay suggestions...</p>}
        {!loading && candidates.length > 0 && (
          <div className="mt-2 border rounded-lg max-h-72 overflow-y-auto">
            <div className="px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-50 border-b">Top eBay suggestions</div>
            {candidates.map((c, i) => <Row key={c.categoryId} c={c} rank={i + 1} />)}
          </div>
        )}
        {!loading && !candidates.length && !error && (
          <p className="text-xs text-gray-500 mt-2">
            No suggestions yet. <button type="button" className="text-blue-600 underline" onClick={load}>Load suggestions</button> or search below.
          </p>
        )}

        <input
          type="text"
          value={query}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search all eBay categories (e.g. 'overload relay')..."
          className="w-full mt-2 px-3 py-2 border rounded-lg text-xs"
        />
        {searching && <p className="text-xs text-gray-500 mt-1">Searching eBay...</p>}
        {results.length > 0 && (
          <div className="mt-2 border rounded-lg max-h-64 overflow-y-auto">
            {results.map(c => <Row key={c.categoryId} c={c} />)}
          </div>
        )}
        {!searching && query.trim().length >= 2 && !results.length && (
          <p className="text-xs text-gray-500 mt-1">No categories found for "{query}"</p>
        )}

        <button
          type="button"
          onClick={confirm}
          disabled={!effectiveSelected || saving || (confirmed && effectiveSelected === current)}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:bg-gray-300 disabled:text-gray-500"
        >
          {saving ? 'Saving...' : 'Confirm this category'}
        </button>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </details>
    </div>
  );
}
