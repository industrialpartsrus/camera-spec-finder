// lib/iprus-standards.js
// =============================================================================
// Loads the IPRUS listing standards from the private repo
// industrialpartsrus/iprus-standards at runtime (server only).
//
//   standards/consolidation_map.csv  -> the only allowed item-specific names
//   standards/value_standards.json   -> voltage / HP / kVA / enclosure rules
//
// NEVER copy the CSV or JSON contents into this repo (CLAUDE.md house rules).
//
// Sources, in order:
//   1. In-memory copy, fresh for 1 hour
//   2. GitHub contents API with IPRUS_STANDARDS_TOKEN (read-only), using ETags
//      so an unchanged file costs no rate limit
//   3. Last good copy saved in Firestore (standards_cache/latest) — used when
//      GitHub can't be reached; the result is marked stale with a warning
//   4. Nothing -> throws StandardsUnavailableError (callers fail closed)
//
// For local tests/scripts, IPRUS_STANDARDS_DIR can point at a checkout's
// standards/ folder instead of GitHub.
// =============================================================================

import fs from 'fs';
import path from 'path';

const REPO = 'industrialpartsrus/iprus-standards';
const FILES = {
  map: 'standards/consolidation_map.csv',
  values: 'standards/value_standards.json',
};
const TTL_MS = 60 * 60 * 1000;
const FIRESTORE_DOC = ['standards_cache', 'latest'];

export class StandardsUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StandardsUnavailableError';
  }
}

let memory = null;   // { standards, fetchedAt }
let etags = {};      // path -> etag of the copy in memory
let inflight = null;

export function compactName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Small RFC 4180 CSV parser (quoted fields, doubled quotes, CRLF)
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  const s = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some(v => v !== '')) rows.push(row);
  return rows;
}

// Builds lookup tables from the raw CSV text and parsed JSON
export function buildStandards(mapCsv, values) {
  const rows = parseCsv(mapCsv);
  const header = rows.shift().map(h => h.trim().toLowerCase());
  const fi = header.indexOf('suredone_field');
  const di = header.indexOf('display_name');
  const pi = header.indexOf('preferred');   // optional column C: 'yes' or empty
  if (fi < 0 || di < 0) throw new Error('consolidation_map.csv: missing suredone_field/display_name columns');

  const fieldToDisplay = new Map();      // suredone_field -> display_name
  const displayToFields = new Map();     // display_name -> [suredone_field, ...] in file order
  const markedPreferred = new Map();     // display_name -> field marked 'yes' in column C
  let mapRows = 0;
  for (const r of rows) {
    const field = (r[fi] || '').trim();
    const display = (r[di] || '').trim();
    if (!field || !display) continue;
    mapRows++;
    fieldToDisplay.set(field, display);
    if (pi >= 0 && (r[pi] || '').trim().toLowerCase() === 'yes' && !markedPreferred.has(display)) {
      markedPreferred.set(display, field);
    }
    if (!displayToFields.has(display)) displayToFields.set(display, []);
    displayToFields.get(display).push(field);
  }

  // Preferred field per display name (iprus-standards README, column C):
  // the 'yes' row, else the field equal to the compact display name, else the first one listed.
  const preferredField = new Map();
  const compactDisplay = new Map();      // compact(display_name) -> display_name
  for (const [display, fields] of displayToFields) {
    const c = compactName(display);
    preferredField.set(display, markedPreferred.get(display) || (fields.includes(c) ? c : fields[0]));
    if (!compactDisplay.has(c)) compactDisplay.set(c, display);
  }

  return {
    map: { fieldToDisplay, displayToFields, preferredField, compactDisplay },
    mapRows,
    preferredCount: markedPreferred.size,
    values,
    version: values?.version || '',
  };
}

async function readLocal(dir) {
  const mapCsv = fs.readFileSync(path.join(dir, 'consolidation_map.csv'), 'utf8');
  const valuesText = fs.readFileSync(path.join(dir, 'value_standards.json'), 'utf8');
  return { mapCsv, valuesText };
}

async function fetchGithubFile(filePath, token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.raw+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'plb-iprus-standards',
  };
  if (etags[filePath]) headers['If-None-Match'] = etags[filePath];
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
    headers,
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 304) return { notModified: true };
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${filePath}`);
  return { text: await res.text(), etag: res.headers.get('etag') };
}

async function getAdminDb() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return null;
  const { default: admin } = await import('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
    });
  }
  return admin.firestore();
}

async function saveLastGood(mapCsv, valuesText) {
  try {
    const db = await getAdminDb();
    if (!db) return;
    await db.collection(FIRESTORE_DOC[0]).doc(FIRESTORE_DOC[1]).set({
      mapCsv, valuesText, savedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('IPRUS_STANDARDS: could not save last good copy:', e.message);
  }
}

async function loadLastGood() {
  try {
    const db = await getAdminDb();
    if (!db) return null;
    const snap = await db.collection(FIRESTORE_DOC[0]).doc(FIRESTORE_DOC[1]).get();
    return snap.exists ? snap.data() : null;
  } catch (e) {
    console.warn('IPRUS_STANDARDS: could not read last good copy:', e.message);
    return null;
  }
}

async function load() {
  const localDir = process.env.IPRUS_STANDARDS_DIR;
  if (localDir) {
    const { mapCsv, valuesText } = await readLocal(localDir);
    return { standards: buildStandards(mapCsv, JSON.parse(valuesText)), stale: false, source: 'local' };
  }

  const token = process.env.IPRUS_STANDARDS_TOKEN;
  let githubError = token ? null : new Error('IPRUS_STANDARDS_TOKEN is not set');
  if (token) {
    try {
      const [m, v] = await Promise.all([
        fetchGithubFile(FILES.map, token),
        fetchGithubFile(FILES.values, token),
      ]);
      if (m.notModified && v.notModified && memory) {
        return { standards: memory.standards, stale: false, source: 'github' };
      }
      // One file changed: refetch both without ETags so the pair stays consistent
      let mapCsv = m.text, valuesText = v.text;
      if (m.notModified || v.notModified) {
        etags = {};
        const [m2, v2] = await Promise.all([fetchGithubFile(FILES.map, token), fetchGithubFile(FILES.values, token)]);
        mapCsv = m2.text; valuesText = v2.text;
        etags = { [FILES.map]: m2.etag, [FILES.values]: v2.etag };
      } else {
        etags = { [FILES.map]: m.etag, [FILES.values]: v.etag };
      }
      const standards = buildStandards(mapCsv, JSON.parse(valuesText));
      saveLastGood(mapCsv, valuesText);   // fire and forget
      return { standards, stale: false, source: 'github' };
    } catch (e) {
      githubError = e;
      etags = {};
    }
  }

  // GitHub unreachable: last copy in memory, then Firestore
  const warning = `IPRUS standards could not be loaded from GitHub (${githubError.message}); using the last cached copy.`;
  if (memory) {
    return { standards: memory.standards, stale: true, source: 'memory', warning };
  }
  const saved = await loadLastGood();
  if (saved?.mapCsv && saved?.valuesText) {
    return {
      standards: buildStandards(saved.mapCsv, JSON.parse(saved.valuesText)),
      stale: true, source: 'firestore', warning: `${warning} Saved ${saved.savedAt}.`,
    };
  }
  throw new StandardsUnavailableError(`IPRUS standards unavailable: ${githubError.message}, and no cached copy exists.`);
}

/**
 * Returns { standards, stale, source, warning? }.
 * standards = { map: { fieldToDisplay, displayToFields, preferredField, compactDisplay }, mapRows, preferredCount, values, version }
 * Throws StandardsUnavailableError when there is no copy at all.
 */
export async function getStandards() {
  if (memory && Date.now() - memory.fetchedAt < TTL_MS) {
    return { standards: memory.standards, stale: memory.stale, source: 'memory', origin: memory.origin, warning: memory.warning };
  }
  if (!inflight) {
    inflight = load()
      .then(result => {
        // A stale copy is retried after 5 minutes instead of a full hour
        const age = result.stale ? TTL_MS - 5 * 60 * 1000 : 0;
        memory = { standards: result.standards, fetchedAt: Date.now() - age, stale: result.stale, warning: result.warning, origin: result.source };
        if (result.stale) console.warn('IPRUS_STANDARDS_STALE:', result.warning);
        return result;
      })
      .finally(() => { inflight = null; });
  }
  return inflight;
}
