// eBay category picker: ranking rules and source order. eBay and Firestore are faked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankCandidates, resolveCategory, getCandidates, choiceDocId } from '../lib/ebay-category-picker.js';

const C = (categoryId, name) => ({ categoryId, name, path: `X > ${name}` });

test('ranking: "Accessories" category is pushed below the real one', () => {
  const r = rankCandidates([C('260824', 'Fuse Accessories'), C('181700', 'Fuses')],
    { productType: 'Fuse', title: 'Bussmann LPJ-30SP Low-Peak Class J Fuse 30A' });
  assert.equal(r[0].categoryId, '181700');
});

test('ranking: Accessories kept when the title says accessory/part', () => {
  const r = rankCandidates([C('260824', 'Fuse Accessories'), C('181700', 'Fuses')],
    { productType: 'Fuse Holder', title: 'Fuse block replacement part' });
  assert.equal(r[0].categoryId, '260824');
});

test('ranking: "Other ..." pushed down, shared product-type words preferred', () => {
  const r = rankCandidates([C('57520', 'Other Sensors'), C('181744x', 'Safety Light Curtains')],
    { productType: 'Light Curtain', title: 'Omron safety light curtain' });
  assert.equal(r[0].categoryId, '181744x');
  assert.ok(r[0].why.some(w => /shares/.test(w)));
});

test('ranking: plurals match (Relay ~ Relays)', () => {
  const r = rankCandidates([C('1', 'Contactors'), C('2', 'Overload Protection Relays')],
    { productType: 'Overload Relay', title: 'Cutler Hammer C306DN3' });
  assert.equal(r[0].categoryId, '2');
});

test('ranking: eBay order decides when nothing else differs', () => {
  const r = rankCandidates([C('1', 'Alpha'), C('2', 'Beta')], { productType: 'Gizmo' });
  assert.deepEqual(r.map(x => x.categoryId), ['1', '2']);
});

const live = (ids) => async (id) => ({ valid: ids.includes(String(id)), leaf: ids.includes(String(id)), categoryId: String(id), name: `Cat ${id}`, reason: ids.includes(String(id)) ? null : 'dead' });
const suggest = async () => [C('260824', 'Fuse Accessories'), C('181700', 'Fuses'), C('999', 'Dead One')];

test('candidates: leaf-only, ranked, max 5', async () => {
  const r = await getCandidates({ productType: 'Fuse', title: 'Class J Fuse' }, { suggestCategories: suggest, checkLeafCategory: live(['260824', '181700']) });
  assert.deepEqual(r.map(x => x.categoryId), ['181700', '260824']);
});

test('source order: remembered choice (live) wins; confirmed once = still needs confirmation', async () => {
  const r = await resolveCategory({ productType: 'Fuse', title: 't', tableId: '181678' }, {
    getRememberedChoice: async () => ({ categoryId: '181700', path: 'B&I > Fuses', count: 1, confirmedBy: 'Alex' }),
    checkLeafCategory: live(['181700', '181678']), suggestCategories: suggest,
  });
  assert.equal(r.source, 'remembered');
  assert.equal(r.categoryId, '181700');
  assert.equal(r.needsConfirmation, true);
  assert.equal(r.confirmedBy, 'Alex');
  assert.equal(r.count, 1);
  assert.equal(r.rank, 1);
});

test('remembered choice confirmed twice is preselected as confirmed', async () => {
  const r = await resolveCategory({ productType: 'Fuse', title: 't' }, {
    getRememberedChoice: async () => ({ categoryId: '181700', count: 2 }),
    checkLeafCategory: live(['181700']), suggestCategories: suggest,
  });
  assert.equal(r.needsConfirmation, false);
});

test('ranking: +20 for Business & Industrial (a bonus, other categories stay)', () => {
  const r = rankCandidates([
    { categoryId: '1', name: 'Necklaces & Pendants', path: 'Jewelry & Watches > Necklaces & Pendants' },
    { categoryId: '2', name: 'Pendant Stations', path: 'Business & Industrial > Pendant Stations' }],
    { productType: 'Pendant Control', title: 'Crane pendant control 6 button' });
  assert.deepEqual(r.map(x => x.categoryId), ['2', '1']);
  assert.ok(r[0].why.some(w => /Business & Industrial/.test(w)));
});

test('source order: dead remembered -> live table ID', async () => {
  const r = await resolveCategory({ productType: 'Fuse', title: 't', tableId: '181678' }, {
    getRememberedChoice: async () => ({ categoryId: '111' }),
    checkLeafCategory: live(['181678', '181700']), suggestCategories: suggest,
  });
  assert.equal(r.source, 'table');
  assert.equal(r.categoryId, '181678');
  assert.equal(r.needsConfirmation, true);
  assert.match(r.notes[0], /no longer valid/);
});

test('source order: dead table ID -> picker with candidates (not an error)', async () => {
  const r = await resolveCategory({ productType: 'Fuse', title: 'Class J Fuse', tableId: '181678' }, {
    getRememberedChoice: async () => null,
    checkLeafCategory: live(['181700', '260824']), suggestCategories: suggest,
  });
  assert.equal(r.source, 'picker');
  assert.equal(r.categoryId, '');
  assert.equal(r.candidates[0].categoryId, '181700');
});

test('source order: Firestore down still falls through', async () => {
  const r = await resolveCategory({ productType: 'Fuse', title: 't', tableId: '181700' }, {
    getRememberedChoice: async () => { throw new Error('offline'); },
    checkLeafCategory: live(['181700']), suggestCategories: suggest,
  });
  assert.equal(r.source, 'table');
});

test('choice doc id is safe for Firestore', () => {
  assert.equal(choiceDocId('Motor Starter / Contactor'), 'motor starter _ contactor');
});

test('ranking: eBay blocked/internal-use categories are never offered', () => {
  const r = rankCandidates([C('263529', 'Blocked Category For Internal Use'), C('1', 'Photoelectric Sensors')], { productType: 'Color Mark Sensor' });
  assert.deepEqual(r.map(x => x.categoryId), ['1']);
});

test('choice doc id avoids Firestore reserved ids', () => {
  assert.equal(choiceDocId('__x__'), 'pt-__x__');
  assert.equal(choiceDocId('..'), 'pt-..');
});

test('search box: exact category-name matches from the tree come before suggestions', async () => {
  const r = await getCandidates({ productType: '', query: 'load cell' }, {
    searchCategoriesByName: async () => [{ categoryId: '777', name: 'Load Cells', path: 'Business & Industrial > Test, Measurement & Inspection > Load Cells' }],
    suggestCategories: async () => [C('181922', 'Switching Mode Power Supplies'), C('261328', 'Trading Card Singles')],
    checkLeafCategory: live(['181922', '261328']),
  });
  assert.equal(r[0].categoryId, '777');
  assert.equal(r.length, 3);
});
