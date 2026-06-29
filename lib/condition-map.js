// lib/condition-map.js
// Idempotent condition mapper: handles internal keys, SureDone values, and freetext
const VALID = ['New', 'New Other', 'Refurbished', 'Used', 'For Parts'];

const KEY_MAP = {
  new_in_box: 'New',
  new_open_box: 'New Other',
  new_no_packaging: 'New Other',
  new_missing_hardware: 'New Other',
  refurbished: 'Refurbished',
  used_excellent: 'Used', like_new_excellent: 'Used',
  used_very_good: 'Used', used_good: 'Used', used_fair: 'Used',
  for_parts: 'For Parts',
};

function toSureDoneCondition(input) {
  if (!input) return 'Used';
  const raw = String(input).trim();
  if (KEY_MAP[raw.toLowerCase()]) return KEY_MAP[raw.toLowerCase()];
  const exact = VALID.find(c => c.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const l = raw.toLowerCase();
  if (l.includes('open') || l.includes('missing') || l.includes('no packaging') || l.includes('new other')) return 'New Other';
  if (l.includes('nib') || l.includes('new in box')) return 'New';
  if (l.includes('refurb')) return 'Refurbished';
  if (l.includes('parts') || l.includes('not working')) return 'For Parts';
  if (l.includes('used') || l.includes('excellent') || l.includes('good') || l.includes('fair')) return 'Used';
  if (l === 'new') return 'New';
  console.warn(`[condition-map] Unrecognized condition "${input}" — defaulting to Used`);
  return 'Used';
}

module.exports = { toSureDoneCondition, VALID_SUREDONE_CONDITIONS: VALID };
