import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyzeNumber, normalizeInput, enrichNumber, prefixValue, reportText } from '../src/core.mjs';
const manifest = JSON.parse(fs.readFileSync(new URL('../public/data/manifest.json', import.meta.url)));
const enrich = r => enrichNumber(r, JSON.parse(fs.readFileSync(new URL(`../public/data/${r.callingCode}.json`, import.meta.url))), manifest);

test('Arabic, Persian, spaced and international-prefix input resolve to one canonical number', () => {
  const reference = analyzeNumber('50012345');
  for (const input of ['٥٠٠١٢٣٤٥', '۵۰۰۱۲۳۴۵', '+965 5001 2345', '00965 5001 2345', '\u200e+96550012345\u200f']) assert.equal(analyzeNumber(input).e164, reference.e164);
  assert.equal(reference.country, 'KW');
  assert.equal(reference.type, 'MOBILE');
});
test('explicit international calling codes override the selected local country', () => {
  assert.equal(analyzeNumber('+442083661177', 'KW').country, 'GB');
  assert.equal(analyzeNumber('02083661177', 'GB').e164, '+442083661177');
});
test('malformed, mixed and oversized input is not silently extracted as a phone number', () => {
  for (const input of ['', '  ', '+999123456', '++96550012345', '5001/2345', 'call +96550012345', '<script>alert(1)</script>', '5001\n2345', '5'.repeat(65)]) assert.throws(() => analyzeNumber(input), { name: 'Error' });
  assert.throws(() => analyzeNumber('50012345', 'NOT_A_COUNTRY'));
});
test('length validation does not claim a subscriber exists', () => {
  const invalid = analyzeNumber('123');
  assert.equal(invalid.valid, false);
  assert.equal(invalid.possible, false);
  assert.equal(invalid.lengthReason, 'TOO_SHORT');
  assert.equal(invalid.ownership, 'غير متحقق');
  assert.equal(invalid.reachability, 'غير متحققة');
  assert.equal(enrich(invalid).carrier, null);
  const invalidPrefix = analyzeNumber('10012345');
  assert.equal(invalidPrefix.possible, true);
  assert.equal(invalidPrefix.valid, false);
});
test('Kuwaiti mobile data does not invent a city or a current carrier', () => {
  const r = enrich(analyzeNumber('50012345'));
  assert.deepEqual(r.timezones, ['Asia/Kuwait']);
  assert.equal(r.carrier, 'فيفا');
  assert.equal(r.area, null);
  assert.equal(r.currentLocation, 'غير متاح من رقم الهاتف');
  assert.match(reportText(r), /المشغل الأصلي/);
  assert.match(reportText(r), /لم يتم التحقق/);
});
test('geographic allocation and time zones use longest-prefix metadata', () => {
  const uk = enrich(analyzeNumber('+442083661177'));
  assert.equal(uk.area, 'London');
  assert.deepEqual(uk.timezones, ['Europe/London']);
  assert.equal(uk.carrier, null);
  const us = enrich(analyzeNumber('+16502530000'));
  assert.equal(us.area, 'Mountain View, CA');
  assert.deepEqual(us.timezones, ['America/Los_Angeles']);
});
test('nongeographic international services have no invented country or time zone', () => {
  const r = enrich(analyzeNumber('+80012345678'));
  assert.equal(r.country, '001');
  assert.equal(r.type, 'TOLL_FREE');
  assert.deepEqual(r.timezones, []);
});
test('a specific prefix takes precedence even when its label index is zero', () => {
  assert.equal(prefixValue({labels:['specific','general'],prefixes:{'965':1,'96550':0}}, '96550012345'), 'specific');
  assert.equal(normalizeInput(' ٠٠٩٦٥ ٥٠٠١-٢٣٤٥ '), '+96550012345');
});
test('public examples agree with the reference; fixed/mobile uncertainty remains conservative', () => {
  const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures.json', import.meta.url)));
  assert.ok(fixtures.length > 450);
  for (const f of fixtures) {
    const r = enrich(analyzeNumber(f.e164));
    assert.equal(r.e164, f.e164, f.e164 + ' format');
    assert.equal(r.valid, true, f.e164 + ' valid');
    assert.equal(r.country || null, f.country, f.e164 + ' country');
    const compatibleType = r.type === f.type || (r.type === 'FIXED_LINE_OR_MOBILE' && ['FIXED_LINE', 'MOBILE'].includes(f.type));
    assert.ok(compatibleType, f.e164 + ' type must agree or be a conservative fixed/mobile classification');
    assert.deepEqual(r.timezones, f.timezones, f.e164 + ' timezone');
  }
});
