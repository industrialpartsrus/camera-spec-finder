// lib/value-standards.js
// =============================================================================
// JavaScript port of the LOGIC in iprus-standards/python/iprus_standards
// (voltage_standard.py, value_standards.py, apply_standards.py).
//
// Every table (voltage groups, HP sizes, kVA sizes, category lists, motor
// enclosures, junk pattern ...) comes from value_standards.json, loaded at
// runtime by lib/iprus-standards.js and passed in as `values`. Nothing from
// the JSON is copied here.
//
// Each normalize* returns { value, groups, flag } like the Python code:
//   value  = the nameplate value in the standard format ('' = left out)
//   groups = filter groups (used by the WooCommerce importer, not by PLB)
//   flag   = why a person should look at it ('' = clean)
//
// PLB differences (approved by Scott):
//   - standardizeValue() keeps the map's item-specific name (Voltage, Enclosure
//     Type ...); it never produces Supply Voltage / Voltage Rating / NEMA Rating /
//     "... Group" fields. A value that says it is a coil voltage -> Coil Voltage.
//   - kVA with no unit is blocked instead of guessed (requireUnit).
// =============================================================================

const NUM = String.raw`\d+(?:\.\d+)?`;

function unique(list) {
  return [...new Set(list)];
}

function numsIn(text) {
  return (String(text).match(new RegExp(NUM, 'g')) || []).map(Number);
}

// Python f'{n:g}'
export function fmtG(n) {
  return String(Number(Number(n).toPrecision(6)));
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------- voltage

function kindOf(t) {
  t = t.toUpperCase().replace(/ /g, '');
  const ac = /VAC|AC(?![A-Z])|~|ALTERNATING/.test(t);
  const dc = /VDC|DC(?![A-Z])|DIRECT/.test(t);
  if (ac && dc) return 'AC/DC';
  return ac ? 'AC' : (dc ? 'DC' : '');
}

function voltageGroups(nums, kind, isRange, V) {
  const table = kind === 'DC' ? V.dc_groups : V.ac_groups;
  let out = [];
  if (isRange && nums.length === 2) {
    const [lo, hi] = [...nums].sort((a, b) => a - b);
    out = table.filter(([a, b]) => b >= lo && a <= hi).map(([, , g]) => g);
  } else {
    for (const n of nums) out.push(...table.filter(([a, b]) => a <= n && n <= b).map(([, , g]) => g));
  }
  return unique(out);
}

export function normalizeVoltage(text, values) {
  const V = values.voltage;
  const junk = new RegExp(V.junk_pattern, 'i');
  const raw = String(text ?? '').trim();
  if (!raw || junk.test(raw)) {
    return { value: '', groups: [], kind: '', flag: raw ? 'no usable voltage' : '' };
  }
  let t = raw.toUpperCase().replaceAll('VOLTS', 'V').replaceAll('VOLT', 'V');
  t = t.replace(/(\d)\s*[.]{2,3}\s*(\d)/g, '$1-$2');                     // 18...30
  t = t.replace(/(\d)\s*(~|TO|–|—)\s*(\d)/g, '$1-$3');                   // 100~240, 100 to 240
  t = t.replace(/V?\s*AC\s*\/\s*V?\s*DC/g, ' AC/DC');                     // 24 Vac/Vdc
  t = t.replace(new RegExp(String.raw`\bAC\s*(${NUM})\s*V?`, 'g'), '$1V AC ');   // AC100V
  t = t.replace(new RegExp(String.raw`\bDC\s*(${NUM})\s*V?`, 'g'), '$1V DC ');   // DC24V
  t = t.replace(new RegExp(String.raw`(${NUM})\s*(MA|A|AMPS?|W|KW|HZ|PTS?|POINTS?|MS|MM|HP|VA|KVA)\b`, 'g'), ' ');
  let flag = '';
  const hasV = t.includes('V');
  const partRe = new RegExp(String.raw`((?:${NUM}\s*V?\s*[-/X]\s*)*${NUM})\s*(V)?\s*(AC\/DC|AC|DC)?`, 'g');
  const parts = [...t.matchAll(partRe)]
    .filter(m => m[1] && (m[2] || m[3] || !hasV))
    .map(m => [m[1].replaceAll('V', ''), m[3] || '']);
  if (!parts.length) return { value: '', groups: [], kind: '', flag: 'no number' };

  const kindAll = kindOf(t);
  const vals = [];
  let groups = [];
  for (let [p, k] of parts) {
    const nums = numsIn(p);
    if (!nums.length || nums.some(n => n > 1000)) continue;        // part numbers, mA etc.
    let kind = k || kindAll;
    let isRange = p.includes('-') && !p.includes('/') && !p.includes('X');
    if ((k || kindAll) === 'DC' && (p.match(/\//g) || []).length === 1 && !p.includes('-') &&
        nums.length === 2 && nums[0] < nums[1]) {
      p = p.replace('/', '-'); isRange = true;                       // DC sensors: 10/30VDC = 10-30VDC
    }
    if (!kind) {
      const max = Math.max(...nums);
      kind = max >= 100 && max !== 90 && max !== 180 ? 'AC' : '';
      if (!kind) flag = 'AC or DC not stated';
    }
    let txt = p.replace(/\s+/g, '').replaceAll('X', 'x');
    txt = txt.replace(/\.0\b/g, '');
    const unit = { AC: 'VAC', DC: 'VDC', 'AC/DC': 'VAC/DC' }[kind] || 'V';
    vals.push(txt + unit);
    if (kind === 'AC' || kind === 'AC/DC') groups.push(...voltageGroups(nums, 'AC', isRange, V));
    if (kind === 'DC' || kind === 'AC/DC') groups.push(...voltageGroups(nums, 'DC', isRange, V));
    if (kind === 'DC' && !voltageGroups(nums, 'DC', isRange, V).length) groups.push(V.other_dc_label);
  }
  if (!vals.length) return { value: '', groups: [], kind: '', flag: 'no voltage found' };
  const leftover = t.replace(new RegExp(String.raw`${NUM}|[-/X.,~ ]|V|AC|DC|HZ|PH(ASE)?|SINGLE|THREE|1|3|MAX|NOM(INAL)?|RATED|\(|\)|±|%`, 'g'), '');
  if (leftover.length > 3 && !flag) flag = 'extra text removed';
  return { value: unique(vals).join(' / '), groups: unique(groups), kind: kindAll, flag };
}

/** attr = consolidated item-specific name. Returns [targetAttribute, result]. */
export function voltageFor(attr, text, category, values) {
  const V = values.voltage;
  category = category || '';
  const inCats = list => list.some(c => category.includes(c));
  let r = normalizeVoltage(text, values);
  const tx = category.endsWith('Transformers');
  if (r.value && r.flag === 'AC or DC not stated' && inCats(V.dc_default_categories)) {
    const n = numsIn(r.value);
    if (n.length && n[0] <= 48) {
      r = normalizeVoltage(r.value.replace(/V+$/, '') + 'VDC', values);
      r.flag = 'DC assumed from category';
    }
  }
  let target;
  if (attr === 'Coil Voltage' || /\bCOIL\b/.test(String(text ?? '').toUpperCase())) {
    target = 'Coil Voltage';
  } else if (inCats(V.rating_only_categories)) {
    target = 'Voltage Rating';
  } else if (category.includes('Servo Motors') && (attr === 'Voltage' || attr === 'Supply Voltage')) {
    target = 'Rated Voltage';
  } else if (['Voltage Rating AC', 'Voltage Rating DC', 'Maximum Operating Voltage'].includes(attr)) {
    target = 'Voltage Rating';
  } else if (attr.startsWith('Output Voltage')) {
    target = tx ? 'Secondary Voltage' : 'Output Voltage';
  } else if (tx && (attr === 'Input Voltage' || attr === 'Voltage')) {
    target = 'Primary Voltage';
  } else {
    target = 'Supply Voltage';
    const nums = numsIn(r.value);
    const big = nums.length > 0 && Math.max(...nums) >= 600 && !r.groups.length;
    if (inCats(V.rating_categories) && (big || (attr === 'Voltage' &&
        ['550-600VAC', '277VAC', '440-480VAC'].some(g => r.groups.includes(g))))) {
      target = 'Voltage Rating';
    } else if (big && Math.max(...nums) >= 660) {
      target = 'Voltage Rating';
    }
  }
  if (target === 'Voltage Rating' || target === 'Rated Voltage') r.groups = [];
  // Motors: '208-460V' / '230-460V' means dual voltage (low / high), not every voltage in between
  if (inCats(V.motor_categories) && target === 'Supply Voltage') {
    const nums = numsIn(r.value);
    if (nums.length && Math.min(...nums) <= 250 && Math.max(...nums) >= 440) {
      r.groups = nums.some(n => n >= 370 && n <= 420)
        ? r.groups.filter(g => g !== '277VAC')
        : r.groups.filter(g => g !== '277VAC' && g !== '380-415VAC');
    }
  }
  return [target, r];
}

// ---------------------------------------------------------------- horsepower

function gcd(a, b) { return b ? gcd(b, a % b) : Math.abs(a); }

// Python Fraction(v).limit_denominator(16)
function limitDenominator(v, maxDen = 16) {
  let best = [Math.round(v), 1];
  for (let d = 2; d <= maxDen; d++) {
    const n = Math.round(v * d);
    if (Math.abs(n / d - v) < Math.abs(best[0] / best[1] - v)) best = [n, d];
  }
  const g = gcd(best[0], best[1]) || 1;
  return [best[0] / g, best[1] / g];
}

function hpText(v) {
  if (v < 1 || v !== Math.trunc(v)) {
    const [num, den] = limitDenominator(v);
    if (Math.abs(num / den - v) < 0.005 && [2, 3, 4, 8, 10, 12, 16, 20, 30].includes(den) && v < 20) {
      const w = Math.floor(num / den), rem = num % den;
      return (w ? `${w}-${rem}/${den}` : `${rem}/${den}`) + ' HP';
    }
    return `${fmtG(v)} HP`;
  }
  return `${v} HP`;
}

function hpGroup(v, values) {
  const H = values.horsepower;
  if (v < 0.5) return H.fractional_label;
  let best = H.standard_sizes[0];
  for (const s of H.standard_sizes) if (Math.abs(s - v) < Math.abs(best - v)) best = s;
  return Math.abs(best - v) <= H.match_tolerance * best ? hpText(best) : '';
}

function parseFraction(s) {
  const [a, b] = s.split('/').map(Number);
  if (!b) throw new Error('bad fraction');
  return a / b;
}

export function normalizeHp(text, values) {
  const raw = String(text ?? '').trim();
  let t = raw.toUpperCase().replaceAll('HORSEPOWER', 'HP');
  if (!raw || /SEE|VARIOUS|N\/A/.test(t)) return { value: '', groups: [], flag: raw ? 'no usable HP' : '' };
  if (/\d\s*K?W\b/.test(t) && !t.includes('HP')) {
    return { value: '', groups: [], flag: 'watts in HP field (move to kW)' };
  }
  t = t.replace(/\([^)]*\)/g, ' ');                                   // drop (0.32 kW)
  const re = new RegExp(String.raw`(\d+\s+\d+/\d+|\d+/\d+|${NUM}|\.\d+)\s*(?:HP)?\s*(?:@|AT)?\s*(${NUM}\s*V)?`, 'g');
  const vals = [], groups = [];
  let flag = '';
  for (const m of t.matchAll(re)) {
    const num = m[1].trim(), volt = m[2];
    let v;
    try {
      if (/\s/.test(num)) {
        const [w, fr] = num.split(/\s+/);
        v = Number(w) + parseFraction(fr);
      } else {
        v = num.includes('/') ? parseFraction(num) : Number(num);
      }
    } catch { continue; }
    if (!Number.isFinite(v)) continue;
    if (v <= 0 || v > 1000) { flag = 'number not plausible as HP'; continue; }
    vals.push(hpText(v) + (volt ? ` @ ${volt.replace(/ /g, '')}` : ''));
    const g = hpGroup(v, values);
    if (g) groups.push(g);
    else if (!flag) flag = 'not a standard size';
  }
  if (!vals.length) return { value: '', groups: [], flag: 'no usable HP' };
  if (raw.includes('/') && vals.length === 2 && !/@|AT/.test(t) && !raw.includes('-') && !raw.trim().includes(' ')) {
    flag = flag || 'two numbers, check';
  }
  return { value: unique(vals).join(' / '), groups: unique(groups), flag };
}

// ---------------------------------------------------------------- phase

export function normalizePhase(text) {
  const t = String(text ?? '').toUpperCase();
  const one = /\b(1|SINGLE|ONE)\b|^1|1PH|1-PH/.test(t);
  const three = /\b(3|THREE)\b|^3|3PH|3-PH/.test(t);
  if (/HP|\//.test(t) && !(one || three)) return { value: '', groups: [], flag: 'not a phase' };
  let v;
  if (one && three) v = 'Single or Three Phase';
  else if (three) v = 'Three Phase';
  else if (one) v = 'Single Phase';
  else if (/\b2\b|TWO/.test(t)) v = 'Two Phase';
  else return { value: '', groups: [], flag: t.trim() ? 'not a phase' : '' };
  if (/\d\/\d|HP/.test(t)) return { value: '', groups: [], flag: 'not a phase' };
  return { value: v, groups: v.includes('or') ? ['Single Phase', 'Three Phase'] : [v], flag: '' };
}

// ---------------------------------------------------------------- RPM

export function normalizeRpm(text, category, values) {
  const t = String(text ?? '').toUpperCase().replaceAll(',', '');
  const nums = numsIn(t);
  if (!nums.length) return { value: '', groups: [], flag: t.trim() ? 'no usable RPM' : '' };
  const sep = /\d\s*[-~]\s*\d/.test(t) ? '-' : (t.includes('/') ? '/' : '');
  const val = sep ? nums.slice(0, 3).map(fmtG).join(sep) : fmtG(nums[0]);
  const groups = [];
  let flag = '';
  if (sep === '/' && nums.length === 2 && nums[1] < nums[0] / 5) flag = 'motor/output speed pair, check';
  category = category || '';
  if (category.includes('Electric Motors') || category.includes('Gear Reducer')) {
    const top = sep !== '/' || !flag ? Math.max(...nums) : nums[0];
    for (const [lo, hi, g] of values.rpm_motor_groups) if (lo <= top && top <= hi) groups.push(g);
  }
  return { value: val + ' RPM', groups, flag };
}

// ---------------------------------------------------------------- kVA

function kvaText(k) {
  return k < 1 ? `${fmtG(k * 1000)}VA` : `${fmtG(k)}kVA`;
}

/**
 * requireUnit (PLB default): a bare number is blocked, because "75" could be
 * 75 VA or 75 kVA. requireUnit=false reproduces the importer's guess.
 */
export function normalizeKva(text, values, { requireUnit = true } = {}) {
  const K = values.kva;
  const t = String(text ?? '').toUpperCase().replace(/ /g, '');
  const m = t.match(new RegExp(String.raw`(${NUM}|\.\d+)(K)?VA`)) || t.match(new RegExp(String.raw`^(${NUM}|\.\d+)()$`));
  if (!m || /\dW/.test(t)) return { value: '', groups: [], flag: t ? 'no usable kVA' : '' };
  const n = Number(m[1]);
  let k, flag = '';
  if (t.includes('VA')) {
    k = m[2] ? n : n / 1000;
  } else if (requireUnit) {
    return { value: '', groups: [], flag: 'kVA needs a unit: enter VA or kVA' };
  } else {
    k = n < 50 ? n : n / 1000;
    flag = 'no unit, assumed ' + (n < 50 ? 'kVA' : 'VA');
  }
  let best = K.standard_sizes_kva[0];
  for (const s of K.standard_sizes_kva) if (Math.abs(s - k) < Math.abs(best - k)) best = s;
  const groups = Math.abs(best - k) <= K.match_tolerance * best ? [kvaText(best)] : [];
  return { value: kvaText(k), groups, flag: flag || (groups.length ? '' : 'not a standard size') };
}

// ---------------------------------------------------------------- amps

export function normalizeAmps(text) {
  const t = String(text ?? '').toUpperCase().replace(/ /g, '').replaceAll('AMPS', 'A').replaceAll('AMP', 'A');
  if (/\dV/.test(t) && !/\dM?A/.test(t)) return { value: '', groups: [], flag: 'voltage in amps field' };
  const vals = [...t.matchAll(new RegExp(String.raw`(${NUM}|\.\d+)(MA|A)?`, 'g'))]
    .map(m => `${fmtG(m[2] === 'MA' ? Number(m[1]) / 1000 : Number(m[1]))}A`);
  if (!vals.length) return { value: '', groups: [], flag: t ? 'no usable amps' : '' };
  const flag = t.includes('A') ? '' : 'no unit, assumed A';
  const sep = /\d-\d/.test(t) ? '-' : '/';
  return { value: vals.slice(0, 3).join(sep), groups: [], flag };
}

// ---------------------------------------------------------------- enclosure

export function normalizeEnclosure(text, values) {
  const t = String(text ?? '').toUpperCase();
  const out = {};
  const ips = unique((t.match(/IP\s?\d[\dXK]/g) || []).map(m => m.replace(/\s/g, ''))).sort();
  if (ips.length) out['IP Rating'] = ips;
  const nemaRe = /(?:NEMA|TYPE)\s*(?:UL\s*)?(?:TYPE\s*)?((?:\d{1,2}[XSRP]?[,/ ]*(?:AND|&)?\s*)+)/g;
  const nemas = [...t.matchAll(nemaRe)].map(m => m[1]);
  if (nemas.length) {
    const codes = unique(nemas.join(' ').match(/\d{1,2}[XSRP]?/g) || [])
      .sort((a, b) => (parseInt(a, 10) - parseInt(b, 10)) || (a < b ? -1 : a > b ? 1 : 0));
    out['NEMA Rating'] = codes.map(c => 'NEMA ' + c);
  }
  for (const [k, v] of Object.entries(values.motor_enclosures)) {
    if (new RegExp(String.raw`\b${escapeRe(k)}\b`).test(t)) { out['Motor Enclosure'] = [v]; break; }
  }
  if (!Object.keys(out).length && /\bOPEN\b/.test(t)) out.Enclosure = ['Open'];
  else if (!Object.keys(out).length && /\bENCLOSED\b|ENCAPSULATED/.test(t)) out.Enclosure = ['Enclosed'];
  const flag = Object.keys(out).length ? '' : 'not recognised';
  return { value: out, groups: Object.values(out).flat(), flag };
}

// ---------------------------------------------------------------- PLB entry point

/**
 * Applies the value standard for one item specific, keeping the map's name.
 * name     = consolidation-map display_name (e.g. 'Voltage', 'Horsepower')
 * category = any text that names the product category (store category path,
 *            eBay category name, usertype); matched by substring like the importer
 * Returns null when this item specific has no value standard, else
 *   { name, value, flag }  — value '' means "leave it out" (flag says why)
 */
export function standardizeValue(name, value, category, values) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const amp = new Set(values.amp_attributes || []);
  let r, target = name;
  if (/volt/i.test(name) && name !== 'Voltage Range') {
    const [t, res] = voltageFor(name, raw, category, values);
    r = res;
    if (t === 'Coil Voltage') target = 'Coil Voltage';   // decision 1 exception
  } else if (name === 'Horsepower') {
    r = normalizeHp(raw, values);
  } else if (name === 'Phase') {
    r = normalizePhase(raw);
  } else if (name === 'RPM' || name === 'Base RPM') {
    r = normalizeRpm(raw, category, values);
  } else if (name === 'KVA') {
    r = normalizeKva(raw, values);
  } else if (amp.has(name)) {
    r = normalizeAmps(raw);
  } else if (name === 'Enclosure Type') {
    r = normalizeEnclosure(raw, values);
    const flat = Object.values(r.value).flat();
    return { name, value: flat.join(' / '), flag: r.flag };
  } else {
    return null;
  }
  return { name: target, value: r.value, flag: r.flag };
}
