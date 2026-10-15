import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EVENT, whatsappUrl, shareText} from '../dist/assets/event.mjs';

test('all four invitation numbers open their own Kuwaiti WhatsApp conversation', () => {
  assert.deepEqual(EVENT.contacts, ['65505654','99732147','50168888','66002205']);
  for (const number of EVENT.contacts) {
    const url = new URL(whatsappUrl(number, 'مبارك لكم 🌷'));
    assert.equal(url.hostname, 'wa.me');
    assert.equal(url.pathname, '/965'+number);
    assert.equal(url.searchParams.get('text'), 'مبارك لكم 🌷');
  }
  // The photography studio number is not a wedding contact.
  assert.throws(() => whatsappUrl('55009914'), RangeError);
  assert.throws(() => whatsappUrl('65505654?text=other'), RangeError);
});

test('map pin is the QR redirect destination, not its map camera center', () => {
  const source=JSON.parse(readFileSync(new URL('../location-source.json',import.meta.url),'utf8'));
  assert.equal(source.latitude,EVENT.latitude);
  assert.equal(source.longitude,EVENT.longitude);
  assert.equal(new URL(EVENT.mapUrl).searchParams.get('query'),`${EVENT.latitude},${EVENT.longitude}`);
  assert.notEqual(EVENT.longitude,47.7092972);
});

test('share uses the public invitation URL without a guest name or private parameters', () => {
  const text=shareText();
  assert.ok(text.endsWith('https://q8-ux.github.io/saad/hamad-wedding/'));
  assert.doesNotMatch(text,/chatgpt\.com|\?to=|localhost/);
});
