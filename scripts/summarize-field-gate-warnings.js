#!/usr/bin/env node
// scripts/summarize-field-gate-warnings.js
// Summarizes FIELD_GATE_WARN log lines (item-specific names the field gate left
// out because they aren't on the Consolidation Map) so HQ can decide which
// names to add to the Google Sheet.
//
// Input: any text or JSON log export that contains the lines, for example
//   vercel logs <deployment-url> > gate.log              (Vercel CLI)
//   a log export downloaded from the Vercel dashboard (JSON or text)
//
// Usage:
//   node scripts/summarize-field-gate-warnings.js gate.log [more.log ...] [--csv out.csv]
//   vercel logs <url> | node scripts/summarize-field-gate-warnings.js --csv out.csv
//
// Output: one row per name: count, distinct SKUs, sample values, suggested map
// name, reason, eBay categories. Never prints anything but the logged fields.

const fs = require('fs');

const args = process.argv.slice(2);
let csvOut = null;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--csv') csvOut = args[++i];
  else files.push(args[i]);
}

const text = files.length
  ? files.map(f => fs.readFileSync(f, 'utf8')).join('\n')
  : fs.readFileSync(0, 'utf8');

// Exports can escape the JSON (\" inside a JSON "message" string): undo one level
const normalized = text.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

// Pull the balanced {...} object that follows each FIELD_GATE_WARN tag
function* warnObjects(s) {
  const tag = 'FIELD_GATE_WARN ';
  let at = 0;
  while ((at = s.indexOf(tag, at)) !== -1) {
    const start = s.indexOf('{', at);
    at += tag.length;
    if (start === -1) break;
    let depth = 0, inStr = false, esc = false, end = -1;
    for (let i = start; i < s.length; i++) {
      const c = s[i];
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) { end = i; break; }
    }
    if (end === -1) continue;
    try { yield JSON.parse(s.slice(start, end + 1)); } catch { /* skip malformed line */ }
  }
}

const byName = new Map();
const seen = new Set();   // the same line can appear twice in some exports
let total = 0;
for (const w of warnObjects(normalized)) {
  const dedupe = JSON.stringify(w);
  if (seen.has(dedupe)) continue;
  seen.add(dedupe);
  total++;
  const name = String(w.name || '(blank)');
  if (!byName.has(name)) byName.set(name, { name, count: 0, skus: new Set(), values: new Map(), suggested: new Set(), reasons: new Set(), categories: new Set() });
  const r = byName.get(name);
  r.count++;
  if (w.sku) r.skus.add(String(w.sku));
  if (w.value !== undefined) r.values.set(String(w.value), (r.values.get(String(w.value)) || 0) + 1);
  if (w.suggested) r.suggested.add(String(w.suggested));
  if (w.reason) r.reasons.add(String(w.reason));
  if (w.ebayCategoryId) r.categories.add(String(w.ebayCategoryId));
}

const rows = [...byName.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).map(r => ({
  name: r.name,
  count: r.count,
  skus: r.skus.size,
  sample_values: [...r.values].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([v]) => v).join(' | '),
  suggested: [...r.suggested].join(' | '),
  reason: [...r.reasons].join(' | '),
  ebay_categories: [...r.categories].join(' '),
}));

console.log(`${total} FIELD_GATE_WARN lines, ${rows.length} distinct names\n`);
for (const r of rows) {
  console.log(`${String(r.count).padStart(5)}  ${r.name}${r.suggested ? `  (closest map name: ${r.suggested})` : ''}`);
  if (r.sample_values) console.log(`       e.g. ${r.sample_values}`);
}

if (csvOut) {
  const esc = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  const cols = ['name', 'count', 'skus', 'sample_values', 'suggested', 'reason', 'ebay_categories'];
  fs.writeFileSync(csvOut, [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n') + '\n');
  console.log(`\nCSV written: ${csvOut}`);
}
