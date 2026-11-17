import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const app = await readFile(new URL('../assets/app.mjs', import.meta.url), 'utf8');
const works = await readFile(new URL('../assets/studio-works.mjs', import.meta.url), 'utf8');
const start = app.indexOf('function yd(');
const end = app.indexOf('function hp(', start);
assert.ok(start >= 0 && end > start, 'Writer selector should remain identifiable in the compiled entry');
const selectorCode = app.slice(start, end);

function renderSelection({work = '', query = '', onSelectedWork, onWorks} = {}) {
  const changes = [];
  const effects = [];
  const href = 'https://q8-ux.github.io/saad/family-online-studio/' + (query ? '?work=' + encodeURIComponent(query) : '');
  const localWindow = {
    location: {href},
    history: {replaceState:(_state, _title, next) => changes.push({history:next})},
  };
  const context = {
    window: localWindow,
    URL,
    Jd: value => new URL(value).searchParams.get('work') || '',
    A: {
      useState(initial) {
        const value = typeof initial === 'function' ? initial() : initial;
        return [value, next => changes.push({selected:next})];
      },
      useEffect(_callback, deps) {effects.push(deps);}
    },
    i: {
      jsx: (element, props, key) => ({element,props,key}),
      jsxs: (element, props, key) => ({element,props,key}),
    },
    rp:'BookEditor',
    hp:'ScriptEditor',
  };
  const selector = runInNewContext(selectorCode + '\nyd',context);
  const rendered = selector({userKey:'test-owner',onSignOut:()=>{},requestedWork:work,onSelectedWork,onWorks});
  return {rendered,changes,effects};
}

test('opening studio without explicit project never loads Barcode', () => {
  assert.doesNotMatch(selectorCode, /"barcode"/);
  const {rendered,changes} = renderSelection();
  assert.equal(rendered.element,'main');
  assert.equal(changes.length,0);
  assert.ok(JSON.stringify(rendered).includes('فتح أعمالي'));
});

test('open only explicitly selected screenplay even when previous URL names Barcode', () => {
  const result = renderSelection({work:'other-series-id',query:'barcode'});
  assert.equal(result.rendered.element,'ScriptEditor');
  assert.equal(result.rendered.props.workKey,'other-series-id');
  assert.equal(result.effects.length,1);
  assert.deepEqual(Array.from(result.effects[0]),['other-series-id'],
    'effect must depend on requestedWork only, not local state');
});

test('selecting another work from inside the editor updates the outer account selection', () => {
  const selected=[];
  const result=renderSelection({work:'barcode',onSelectedWork:id=>selected.push(id)});
  result.rendered.props.onWorkChange('another-play-id');
  assert.deepEqual(selected,['another-play-id']);
  assert.ok(result.changes.some(entry=>entry.selected==='another-play-id'));
  assert.equal(result.rendered.props.workKey,'barcode',
    'existing child is unmounted by the account wrapper when selectedWork changes');
});

test('opening a book keeps its requested ID and does not reuse a screenplay', () => {
  const result=renderSelection({work:'w-book-foreign-1',query:'barcode'});
  assert.equal(result.rendered.element,'BookEditor');
  assert.equal(result.rendered.props.workKey,'w-book-foreign-1');
});

test('authenticated project list owns project changes and does not select a default on login', () => {
  assert.match(works,/onSelectedWork: id =>/);
  assert.match(works,/onWorks: \(\) => \{ choose\(null\)/);
  assert.match(works,/onClick: \(\) => choose\(work\.id\)/);
  assert.match(works,/setActive\(id\)/);
  assert.match(works,/const landing = new URL\(window\.location\.href\)/);
});
