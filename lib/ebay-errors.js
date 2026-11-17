// lib/ebay-errors.js
// eBay's answer inside a SureDone item result. SureDone can say "success" for the
// item while eBay rejected it, e.g. AI2945 /relist 2026-11-17:
//   errors = "ebay Main:82 Error | ErrorCode:717 ShortMessage: Package weight is not
//             valid or is missing... LongMessage: ..."
// Only `errors` and `apicodes` are read. Warnings (and anything in `notices`) are
// not failures. Safe to import in the browser and on the server.

function collectStrings(v, out) {
  if (v == null) return out;
  if (typeof v === 'string') { if (v.trim()) out.push(v.trim()); return out; }
  if (typeof v === 'number') return out;
  if (Array.isArray(v)) { v.forEach(x => collectStrings(x, out)); return out; }
  if (typeof v === 'object') Object.values(v).forEach(x => collectStrings(x, out));
  return out;
}

// "ebay Main:82 Error |" starts each eBay message; ShortMessage/LongMessage are
// often on their own lines (AI2973: "ErrorCode:21919326\nShortMessage:Part Number ...")
const HEADER = /(?=\bebay\w*\s+\S+\s+(?:Error|Warning)\s*\|)/i;

const NAMED = { quot: '"', amp: '&', lt: '<', gt: '>', apos: "'", nbsp: ' ', Uuml: 'Ü', uuml: 'ü', Ouml: 'Ö', ouml: 'ö', Auml: 'Ä', auml: 'ä', szlig: 'ß', deg: '°', plusmn: '±', micro: 'µ', reg: '®', trade: '™', copy: '©' };
export function decodeEntities(t = '') {
  return String(t)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n] ?? m);
}

// Text after "Label:" up to the next label (LongMessage/ShortMessage/ErrorCode/SeverityCode) or the end
const pick = (seg, label) => {
  const m = seg.match(new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\s*(?:ShortMessage:|LongMessage:|ErrorCode:|SeverityCode:)|\\s*$)`, 'i'));
  return m ? decodeEntities(m[1].replace(/\s+/g, ' ').trim()) : '';
};

/** Lister-facing wording for an eBay message (falls back to eBay's own short message). */
export function plainEbayMessage(short = '', long = '') {
  const t = `${short} ${long}`;
  if (/weight/i.test(t)) return 'eBay needs a package weight (enter the weight, more than 0).';
  if (/dimension|package (length|width|height|depth)|package size/i.test(t)) return 'eBay needs the box dimensions (length, width and height).';
  if (/categor/i.test(t)) return 'eBay says the category is invalid or missing: pick the eBay category again.';
  if (/picture|image|photo/i.test(t)) return `eBay rejected the photos: ${short || long}`;
  if (/item specific/i.test(t)) return `eBay needs an item specific: ${short || long}`;
  if (/return polic/i.test(t)) return `eBay return policy problem: ${short || long}`;
  if (/shipping|postage/i.test(t)) return `eBay shipping problem: ${short || long}`;
  return short || long || 'eBay rejected the listing (no message).';
}

/**
 * itemResult: SureDone's per-item result (response["1"]).
 * Returns [{ severity: 'error'|'warning', code, short, long, plain, raw }].
 */
export function parseEbayMessages(itemResult) {
  if (!itemResult || typeof itemResult !== 'object') return [];
  const texts = collectStrings([itemResult.errors, itemResult.apicodes], []);
  const out = [];
  const seen = new Set();
  for (const text of texts) {
    // One entry per "ebay ... Error|Warning" header (or per line)
    const segs = text.split(HEADER).map(s => s.trim()).filter(Boolean);
    for (const seg of segs) {
      const isEbay = /\bebay/i.test(seg) || /ErrorCode:/i.test(seg);
      if (!isEbay) continue;
      const header = seg.split('|')[0];
      const severity = /warning/i.test(header) || /SeverityCode:\s*Warning/i.test(seg) ? 'warning' : 'error';
      const code = (seg.match(/ErrorCode:\s*(\d+)/i) || [])[1] || '';
      const short = pick(seg, 'ShortMessage');
      const long = pick(seg, 'LongMessage');
      const key = `${severity}|${code}|${short}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ severity, code, short, long, plain: plainEbayMessage(short, long || (short ? '' : seg)), raw: decodeEntities(seg).slice(0, 500) });
    }
  }
  return out;
}

export const ebayErrorsOnly = (itemResult) => parseEbayMessages(itemResult).filter(m => m.severity === 'error');
