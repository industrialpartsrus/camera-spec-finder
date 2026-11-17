import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEbayMessages, ebayErrorsOnly } from '../lib/ebay-errors.js';

test('ebay errors: AI2945 package weight error inside an item "success"', () => {
  const item = {
    result: 'success',
    errors: 'ebay Main:82 Error | ErrorCode:717 ShortMessage: Package weight is not valid or is missing. LongMessage: Package weight is not valid or is missing.',
    notices: 'ebay Main:82 Warning | ErrorCode:21920200 ShortMessage: Return Policy Attribute Not Valid',
  };
  const errs = ebayErrorsOnly(item);
  assert.equal(errs.length, 1);
  assert.equal(errs[0].code, '717');
  assert.match(errs[0].short, /^Package weight is not valid/);
  assert.equal(errs[0].plain, 'eBay needs a package weight (enter the weight, more than 0).');
});

test('ebay errors: warnings are not failures; notices are ignored', () => {
  const item = { result: 'success', apicodes: { 0: 'ebay Main:82 Warning | ErrorCode:21920200 ShortMessage: Return Policy Attribute Not Valid' } };
  assert.equal(ebayErrorsOnly(item).length, 0);
  assert.equal(parseEbayMessages(item)[0].severity, 'warning');
  assert.equal(ebayErrorsOnly({ result: 'success', notices: 'ebay Main:82 Error | ErrorCode:1 ShortMessage: x' }).length, 0);
});

test('ebay errors: two errors in one string, non-eBay codes ignored', () => {
  const item = { errors: { 0: 'title:62', 1: 'ebay Main:82 Error | ErrorCode:717 ShortMessage: Package weight is missing. ebay Main:82 Error | ErrorCode:87 ShortMessage: The category is not valid' } };
  const errs = ebayErrorsOnly(item);
  assert.deepEqual(errs.map(e => e.code), ['717', '87']);
  assert.match(errs[1].plain, /category/);
});

test('ebay errors: AI2973 ShortMessage on its own line, entities decoded', () => {
  const item = {
    result: 'success',
    errors: 'ebay Main:82 Error | ErrorCode:21919326\nShortMessage:Part Number has an invalid value of &quot;B&Uuml;RKERT 000014212 DN13 PN25 STAINLESS STEEL 316L&quot;. Enter a valid value and try again...\nLongMessage:Part Number has an invalid value of &quot;B&#220;RKERT 000014212 DN13 PN25 STAINLESS STEEL 316L&quot;. The value can be up to 65 characters.',
  };
  const errs = ebayErrorsOnly(item);
  assert.equal(errs.length, 1);
  assert.equal(errs[0].code, '21919326');
  assert.equal(errs[0].short, 'Part Number has an invalid value of "BÜRKERT 000014212 DN13 PN25 STAINLESS STEEL 316L". Enter a valid value and try again...');
  assert.match(errs[0].long, /^Part Number has an invalid value of "BÜRKERT .*65 characters\.$/);
  assert.equal(errs[0].plain, errs[0].short);
});

test('ebay errors: same text with literal quotes (as in the HQ report)', () => {
  const item = { errors: 'ebay Main:82 Error | ErrorCode:21919326\nShortMessage:Part Number has an invalid value of "BÜRKERT 000014212 DN13 PN25 STAINLESS STEEL 316L". Enter a valid value and try again...\nLongMessage:...' };
  const [e] = ebayErrorsOnly(item);
  assert.equal(e.short, 'Part Number has an invalid value of "BÜRKERT 000014212 DN13 PN25 STAINLESS STEEL 316L". Enter a valid value and try again...');
  assert.equal(e.long, '...');
});

test('ebay errors: ErrorCode:717 weight string from AI2945 (newline format)', () => {
  const item = { result: 'success', errors: 'ebay Main:82 Error | ErrorCode:717\nShortMessage:Package weight is not valid or is missing.\nLongMessage:Package weight is not valid or is missing. Please enter a valid package weight.' };
  const [e] = ebayErrorsOnly(item);
  assert.equal(e.code, '717');
  assert.equal(e.short, 'Package weight is not valid or is missing.');
  assert.equal(e.plain, 'eBay needs a package weight (enter the weight, more than 0).');
});
