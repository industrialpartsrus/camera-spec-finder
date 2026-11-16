// Run with the value-standards tests: npm test (needs IPRUS_STANDARDS_DIR or IPRUS_STANDARDS_TOKEN)
// eBay aspects are faked here; production uses the live Taxonomy API.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gateItemSpecifics, suggestName } from '../lib/field-gate.js';
import { getStandards } from '../lib/iprus-standards.js';

const canLoad = Boolean(process.env.IPRUS_STANDARDS_DIR || process.env.IPRUS_STANDARDS_TOKEN);
const skip = canLoad ? false : 'set IPRUS_STANDARDS_DIR or IPRUS_STANDARDS_TOKEN';

const aspect = (ebayName, extra = {}) => ({
  ebayName, required: false, usage: 'OPTIONAL', mode: 'FREE_TEXT', allowedValues: [], ...extra,
});
const fakeAspects = (list) => async () => ({ all: list, required: list.filter(a => a.required) });

const ASPECTS = [
  aspect('Brand', { required: true }),
  aspect('Zorbification Level', { required: true }),
  aspect('Flux Capacitor Style', { required: true, mode: 'SELECTION_ONLY', allowedValues: ['Classic', 'Modern'] }),
  aspect('Quantum Wobble', { usage: 'RECOMMENDED' }),
  aspect('Required But Empty', { required: true }),
];

const run = (entries, opts = {}) => gateItemSpecifics({
  entries, ebayCategoryId: '12345', category: 'Electric Motors', sku: 'TEST1',
  getAspects: fakeAspects(ASPECTS), ...opts,
});
const sent = (r) => Object.fromEntries(r.fields);

test('gate: map fields pass, values normalized, map name kept', { skip }, async () => {
  const r = await run([['ebayitemspecificsvoltage', '230/460 vac'], ['horsepower', '1 1/2']]);
  assert.equal(r.ok, true);
  assert.equal(sent(r).voltage, '230/460VAC');
  assert.equal(sent(r).horsepower, '1-1/2 HP');
});

test('gate: eBay casing with spaces resolves to the map field', { skip }, async () => {
  const r = await run([['ebayitemspecificsCountry/Region of Manufacture', 'Japan']]);
  const keys = r.fields.map(([k]) => k);
  assert.equal(keys.length, 1);
  assert.match(keys[0], /countr/);
  assert.equal(r.warnings.length, 0);
});

test('gate: every mapped field is sent; different values on one map name are a conflict', { skip }, async () => {
  const r = await run([['voltage', '24VDC'], ['nominalvoltage', '12VDC']]);
  const keys = r.fields.map(([k]) => k);
  assert.equal(keys.length, 2);
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.conflicts[0].display, 'Voltage');
});

test('gate: IP14820 frame=DF100L and iecframesize=IP55 are both sent and reported', { skip }, async () => {
  const r = await run([['ebayitemspecificsiecframesize', 'IP55'], ['frame', 'DF100L']]);
  const out = sent(r);
  assert.equal(out.ebayitemspecificsiecframesize, 'IP55');
  assert.equal(Object.entries(out).find(([k]) => /frame$/.test(k))?.[1], 'DF100L');
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.conflicts[0].display, 'Frame Size');
  assert.deepEqual(r.conflicts[0].fields.map(f => f.value), ['IP55', 'DF100L']);
  assert.ok(r.conflicts[0].fields.every(f => f.sent));
});

test('gate: exact duplicate key is skipped; same value is not a conflict', { skip }, async () => {
  const r = await run([['ebayitemspecificsvoltage', '24VDC'], ['voltage', '24 vdc']]);
  assert.equal(r.fields.length, 1);
  assert.equal(r.conflicts.length, 0);
});

test('gate: bare kVA number stops the push even in warn mode', { skip }, async () => {
  const r = await run([['kva', '75']]);
  assert.equal(r.ok, false);
  assert.equal(r.blocked[0].name, 'KVA');
  const ok = await run([['kva', '75 kVA']]);
  assert.equal(ok.ok, true);
  assert.equal(sent(ok).kva, '75kVA');
});

test('gate: eBay-required aspect not on map is created with a clean name and logged', { skip }, async () => {
  const r = await run([['ebayitemspecificsZorbification Level', 'High']]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.fields, [['ebayitemspecificszorbificationlevel', 'High']]);
  assert.deepEqual(r.created, [{ aspect: 'Zorbification Level', field: 'ebayitemspecificszorbificationlevel', value: 'High' }]);
});

test('gate: SELECTION_ONLY required aspect needs an allowed value', { skip }, async () => {
  const good = await run([['fluxcapacitorstyle', 'classic']]);
  assert.deepEqual(good.fields, [['ebayitemspecificsfluxcapacitorstyle', 'Classic']]);
  const bad = await run([['fluxcapacitorstyle', 'Steampunk']]);
  assert.equal(bad.fields.length, 0);
  assert.equal(bad.created.length, 0);
  assert.equal(bad.warnings[0].reason, 'eBay requires one of its allowed values');
});

test('gate: optional/recommended name not on map is left out in warn mode', { skip }, async () => {
  const r = await run([['ebayitemspecificsQuantum Wobble', 'Lots'], ['voltage', '24VDC']]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.fields, [['voltage', '24VDC']]);
  assert.equal(r.warnings[0].name, 'Quantum Wobble');
  assert.equal(r.created.length, 0);
});

test('gate: block mode stops the push for unknown names', { skip }, async () => {
  const r = await run([['ebayitemspecificsQuantum Wobble', 'Lots']], { mode: 'block' });
  assert.equal(r.ok, false);
  assert.equal(r.blocked[0].name, 'Quantum Wobble');
});

test('gate: AI-supplied required list is never trusted (no eBay data = not created)', { skip }, async () => {
  const r = await run([['ebayitemspecificsZorbification Level', 'High']], {
    getAspects: async () => { throw new Error('eBay down'); },
  });
  assert.equal(r.fields.length, 0);
  assert.equal(r.created.length, 0);
  assert.match(r.warnings[0].reason, /eBay aspects unavailable/);
});

test('gate: missing required aspects are reported (brand is a core field)', { skip }, async () => {
  const r = await run([['voltage', '24VDC']]);
  assert.ok(r.missingRequired.includes('Required But Empty'));
  assert.ok(r.missingRequired.includes('Zorbification Level'));
  assert.ok(!r.missingRequired.includes('Brand'));
});

test('gate: suggestions point at a real map name', { skip }, async () => {
  const { standards } = await getStandards();
  assert.equal(suggestName('Supply Voltage', standards.map), 'Voltage');
  assert.equal(suggestName('Motor Horsepower Rating', standards.map), 'Horsepower');
});

test('standards: preferred column picks the field (Type -> usertype, Size -> equipmentsize)', { skip }, async () => {
  const { standards } = await getStandards();
  assert.equal(standards.map.preferredField.get('Type'), 'usertype');
  assert.equal(standards.map.preferredField.get('Size'), 'equipmentsize');
  assert.ok(standards.preferredCount >= 2);
  assert.ok(standards.mapRows > 0);
});

test('gate: eBay "Type" never overrides the route usertype', { skip }, async () => {
  const r = await run([['ebayitemspecificsType', 'Solenoid Valve']], { coreValues: { usertype: 'Pneumatic Valve' } });
  assert.deepEqual(r.fields, []);
  assert.ok(!r.missingRequired.includes('Type'));
});

test('gate: eBay "Type" fills usertype only when it is empty', { skip }, async () => {
  const r = await run([['ebayitemspecificsType', 'Solenoid Valve']], { coreValues: { usertype: '' } });
  assert.deepEqual(r.fields, [['usertype', 'Solenoid Valve']]);
});

test('gate: "Unit Type" is not mixed with Type', { skip }, async () => {
  const r = await run([['ebayitemspecificsUnit Type', 'lbs']], { coreValues: { usertype: '' } });
  assert.ok(!r.fields.some(([k]) => k === 'usertype'));
});

test('gate: bundle fields pass through unchanged', { skip }, async () => {
  const r = await run([['ebayitemspecificscustombundle', 'Yes'], ['ebayitemspecificsbundledescription', 'ABB X1, ABB X2']]);
  assert.deepEqual(r.fields, [['ebayitemspecificscustombundle', 'Yes'], ['ebayitemspecificsbundledescription', 'ABB X1, ABB X2']]);
  assert.equal(r.warnings.length, 0);
});
