import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EVENT, whatsappUrl, daysToEvent, countdownText, googleCalendarUrl, calendarIcs, shareText} from '../dist/assets/event.mjs';

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

test('day countdown follows Kuwait midnight rather than the device timezone', () => {
  assert.equal(daysToEvent(new Date('2026-10-15T18:53:19Z')),5);
  assert.equal(daysToEvent(new Date('2026-10-18T20:59:59Z')),2);
  assert.equal(daysToEvent(new Date('2026-10-18T21:00:00Z')),1);
  assert.equal(daysToEvent(new Date('2026-10-19T21:00:00Z')),0);
  assert.equal(daysToEvent(new Date('2026-10-20T21:00:00Z')),-1);
  assert.match(countdownText(new Date('2026-10-19T18:00:00Z')),/غدًا/);
  assert.match(countdownText(new Date('2026-10-20T10:00:00Z')),/اليوم/);
  assert.match(countdownText(new Date('2026-10-21T10:00:00Z')),/شكرًا/);
});

test('calendar preserves an unspecified evening time and uses an exclusive next-day end', () => {
  const url = new URL(googleCalendarUrl());
  assert.equal(url.searchParams.get('dates'),'20261020/20261021');
  assert.equal(url.searchParams.get('ctz'),'Asia/Kuwait');
  assert.match(url.searchParams.get('details'),/مساء الثلاثاء/);
  assert.match(url.searchParams.get('details'),/لم تُحدَّد/);
  assert.match(url.searchParams.get('location'),/شارع 24/);
  const ics = calendarIcs();
  assert.match(ics,/DTSTART;VALUE=DATE:20261020\r\n/);
  assert.match(ics,/DTEND;VALUE=DATE:20261021\r\n/);
  assert.doesNotMatch(ics,/DTSTART.*T\d{6}/);
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line,'utf8')<=75,'ICS line exceeds 75 octets');
  assert.equal(readFileSync(new URL('../dist/hamad-wedding.ics',import.meta.url),'utf8'),ics);
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
