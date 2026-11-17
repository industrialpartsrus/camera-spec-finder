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
