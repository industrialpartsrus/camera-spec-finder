// Run: IPRUS_STANDARDS_DIR=<checkout>/standards npm test
// (or IPRUS_STANDARDS_TOKEN=<read-only token> npm test to read from GitHub)
// Cases ported from iprus-standards/tests/test_standards.py, plus PLB rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getStandards } from '../lib/iprus-standards.js';
import {
  normalizeVoltage, voltageFor, normalizeHp, normalizePhase, normalizeRpm,
  normalizeKva, normalizeAmps, normalizeEnclosure, standardizeValue,
} from '../lib/value-standards.js';

const canLoad = Boolean(process.env.IPRUS_STANDARDS_DIR || process.env.IPRUS_STANDARDS_TOKEN);
const skip = canLoad ? false : 'set IPRUS_STANDARDS_DIR or IPRUS_STANDARDS_TOKEN';
const values = async () => (await getStandards()).standards.values;

// ---- the cases from test_standards.py --------------------------------------

const V = [['24Vdc', '24VDC', ['24VDC']], ['AC100V', '100VAC', ['100-120VAC']],
  ['208-230/460 VAC', '208-230/460VAC', ['200-240VAC', '440-480VAC']],
  ['100~240VAC', '100-240VAC', ['100-120VAC', '200-240VAC']], ['240x480', '240x480VAC', ['200-240VAC', '440-480VAC']],
  ['24 Vac/Vdc', '24VAC/DC', ['24VAC', '24VDC']], ['10/30VDC', '10-30VDC', ['12VDC', '24VDC']],
  ['24V DC, 6mA, 16 pts', '24VDC', ['24VDC']], ['18...30VDC', '18-30VDC', ['24VDC']],
  ['See label', '', []], ['90VDC', '90VDC', ['90VDC']], ['180 VDC', '180VDC', ['180VDC']]];
const ROLE = [['Voltage', '690V', 'Industrial Controls > Contactors', 'Voltage Rating', []],
  ['Voltage', '230-460V 3 Phase', 'Power Transmission > Electric Motors', 'Supply Voltage', ['200-240VAC', '440-480VAC']],
  ['Voltage', '230/400', 'Power Transmission > Electric Motors', 'Supply Voltage', ['200-240VAC', '380-415VAC']],
  ['Input Voltage', '600V AC', 'Electrical > Circuit Breakers', 'Voltage Rating', []],
  ['Voltage', '240 x 480V AC', 'Electrical > Transformers', 'Primary Voltage', ['200-240VAC', '440-480VAC']],
  ['Voltage', '120 Vac Coil', 'Industrial Controls > Contactors', 'Coil Voltage', ['100-120VAC']],
  ['Voltage', '134V', 'Motion Control > Servo Motors', 'Rated Voltage', []],
  ['Output Voltage', '24', 'Automation Control > Power Supply', 'Output Voltage', ['24VDC']]];
const HP = [['2', '2 HP', ['2 HP']], ['3/4', '3/4 HP', ['3/4 HP']], ['1 1/2', '1-1/2 HP', ['1-1/2 HP']],
  ['0.5 HP', '1/2 HP', ['1/2 HP']], ['2 HP @ 230V, 5 HP @ 460V', '2 HP @ 230V / 5 HP @ 460V', ['2 HP', '5 HP']],
  ['0.02 HP', '0.02 HP', ['Fractional (under 1/2 HP)']], ['90W', '', []]];
const PH = [['3', 'Three Phase'], ['1', 'Single Phase'], ['3PH', 'Three Phase'], ['1 or 3 Phase', 'Single or Three Phase'], ['7.5 HP', '']];
const RPM = [['1725', ['1800 RPM (4-pole)']], ['1460/1760rpm', ['1800 RPM (4-pole)']], ['1170', ['1200 RPM (6-pole)']], ['3000 RPM', ['3600 RPM (2-pole)']]];
const KVA = [['0.5', '500VA'], ['45 KVA', '45kVA'], ['5000VA', '5kVA'], ['300', '300VA'], ['1KVA (1000VA)', '1kVA']];
const AMP = [['10A', '10A'], ['15 Amp', '15A'], ['200mA', '0.2A'], ['275V', '']];
const ENC = [['IP67 / NEMA 6', { 'IP Rating': ['IP67'], 'NEMA Rating': ['NEMA 6'] }],
  ['TEFC (Totally Enclosed Fan Cooled)', { 'Motor Enclosure': ['TEFC'] }],
  ['Type 4/13', { 'NEMA Rating': ['NEMA 4', 'NEMA 13'] }], ['Enclosed', { Enclosure: ['Enclosed'] }]];

test('voltage (test_standards.py)', { skip }, async () => {
  const vs = await values();
  for (const [raw, val, groups] of V) {
    const r = normalizeVoltage(raw, vs);
    assert.deepEqual([r.value, r.groups], [val, groups], raw);
  }
});

test('voltage role (test_standards.py)', { skip }, async () => {
  const vs = await values();
  for (const [attr, raw, cat, target, groups] of ROLE) {
    const [t, r] = voltageFor(attr, raw, cat, vs);
    assert.deepEqual([t, r.groups], [target, groups], `${raw} [${cat}]`);
  }
});

test('horsepower (test_standards.py)', { skip }, async () => {
  const vs = await values();
  for (const [raw, val, groups] of HP) {
    const r = normalizeHp(raw, vs);
    assert.deepEqual([r.value, r.groups], [val, groups], raw);
  }
});

test('phase (test_standards.py)', { skip }, () => {
  for (const [raw, val] of PH) assert.equal(normalizePhase(raw).value, val, raw);
});

test('rpm groups (test_standards.py)', { skip }, async () => {
  const vs = await values();
  for (const [raw, groups] of RPM) {
    assert.deepEqual(normalizeRpm(raw, 'Power Transmission > Electric Motors', vs).groups, groups, raw);
  }
});

test('kVA, importer behaviour (test_standards.py)', { skip }, async () => {
  const vs = await values();
  for (const [raw, val] of KVA) assert.equal(normalizeKva(raw, vs, { requireUnit: false }).value, val, raw);
});

test('amps (test_standards.py)', { skip }, () => {
  for (const [raw, val] of AMP) assert.equal(normalizeAmps(raw).value, val, raw);
});

test('enclosure (test_standards.py)', { skip }, async () => {
  const vs = await values();
  for (const [raw, val] of ENC) assert.deepEqual(normalizeEnclosure(raw, vs).value, val, raw);
});

// ---- PLB rules (decisions approved by Scott) -------------------------------

test('PLB: bare kVA number is blocked, unit required', { skip }, async () => {
  const vs = await values();
  for (const raw of ['75', '0.5', '300']) {
    const r = normalizeKva(raw, vs);
    assert.equal(r.value, '', raw);
    assert.match(r.flag, /needs a unit/, raw);
  }
});

test('PLB: transformers over 50 kVA keep their size', { skip }, async () => {
  const vs = await values();
  assert.equal(normalizeKva('75 kVA', vs).value, '75kVA');
  assert.equal(normalizeKva('112.5KVA', vs).value, '112.5kVA');
  assert.equal(normalizeKva('500 kVA', vs).value, '500kVA');
  assert.equal(normalizeKva('750VA', vs).value, '750VA');
});

test('PLB: map name is kept, value normalized', { skip }, async () => {
  const vs = await values();
  const motors = 'Power Transmission > Electric Motors';
  assert.deepEqual(standardizeValue('Voltage', '230/460 vac', motors, vs), { name: 'Voltage', value: '230/460VAC', flag: '' });
  assert.equal(standardizeValue('Voltage', '690V', 'Industrial Controls > Contactors', vs).name, 'Voltage');
  assert.equal(standardizeValue('Horsepower', '1 1/2', motors, vs).value, '1-1/2 HP');
  assert.equal(standardizeValue('Phase', '3', motors, vs).value, 'Three Phase');
  assert.equal(standardizeValue('RPM', '1725', motors, vs).value, '1725 RPM');
  assert.equal(standardizeValue('Enclosure Type', 'IP67 / NEMA 6', '', vs).value, 'IP67 / NEMA 6');
  assert.equal(standardizeValue('Enclosure Type', 'TEFC', motors, vs).value, 'TEFC');
  assert.equal(standardizeValue('Brand', 'Baldor', motors, vs), null);
});

test('PLB: a value that says coil goes to Coil Voltage', { skip }, async () => {
  const vs = await values();
  const r = standardizeValue('Voltage', '120 Vac Coil', 'Industrial Controls > Contactors', vs);
  assert.deepEqual([r.name, r.value], ['Coil Voltage', '120VAC']);
});

test('PLB: junk is left out with a flag', { skip }, async () => {
  const vs = await values();
  const r = standardizeValue('Voltage', 'See label', '', vs);
  assert.equal(r.value, '');
  assert.equal(r.flag, 'no usable voltage');
});
