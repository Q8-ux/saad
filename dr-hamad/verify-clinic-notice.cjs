const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/clinic-notice.js', 'utf8');
const expiry = '2026-11-08T00:00:00+03:00';

function runAt(instant, invalid = false) {
  let now = Date.parse(instant), scheduled;
  const handlers = {};
  const make = tagName => ({tagName, isConnected: true, hidden: true,
    dataset: {expiresAt: invalid ? 'invalid' : expiry}, open: tagName === 'DIALOG',
    close() {this.open = false; this.closed = true;}, remove() {this.isConnected = false;}});
  const banner = make('SECTION'), dialog = make('DIALOG');
  const date = class extends Date {static now() {return now;}};
  const context = {Date: date, document: {
    querySelectorAll: selector => selector === '[data-expiring-notice]' ? [banner, dialog] : [],
    addEventListener: (name, fn) => {handlers[name] = fn;}
  }, window: {addEventListener: (name, fn) => {handlers[name] = fn;}},
  setTimeout: (fn, delay) => {scheduled = {fn, delay}; return 1;}, clearTimeout() {scheduled = undefined;}};
  vm.runInNewContext(source, context);
  return {banner, dialog, handlers, get timer() {return scheduled;}, advance(instant) {now = Date.parse(instant);}};
}

assert.equal(Date.parse(expiry), Date.parse('2026-11-07T21:00:00Z'));
const active = runAt('2026-11-07T20:59:59.999Z');
assert.equal(active.banner.hidden, false);
assert.equal(active.banner.isConnected, true);
assert.equal(active.timer.delay, 1);
active.advance('2026-11-07T21:00:00Z'); active.timer.fn();
assert.equal(active.banner.isConnected, false);
assert.equal(active.dialog.isConnected, false);
assert.equal(active.dialog.closed, true);
for (const instant of ['2026-11-08T00:00:00+03:00', '2026-11-08T00:00:00-05:00']) {
  const expired = runAt(instant);
  assert.equal(expired.banner.isConnected, false);
  assert.equal(expired.timer, undefined);
}
const resumed = runAt('2026-10-31T12:00:00Z');
resumed.advance('2026-11-08T08:00:00+03:00'); resumed.handlers.visibilitychange();
assert.equal(resumed.banner.isConnected, false);
assert.equal(runAt('2026-10-31T12:00:00Z', true).banner.isConnected, false);
console.log('PASS: Kuwait midnight boundary, open-page expiry, dialog closure, other timezones, background resume, invalid date.');
