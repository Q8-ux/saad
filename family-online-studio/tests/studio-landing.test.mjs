import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudioWorks} from '../assets/studio-works.mjs';

function createHarness(startUrl) {
  const originalWindow = globalThis.window;
  let href = startUrl;
  globalThis.window = {
    location: {get href() {return href;}},
    history: {replaceState(_state, _unused, relative) {href = new URL(relative, href).href;}},
    dispatchEvent() {},
  };
  let hook = 0;
  const hooks = [];
  const pending = [];
  function Studio() {}
  const React = {
    createElement(type, props, ...children) {return {type, props:props||{}, children};},
    useState(initial) {
      const slot = hook++;
      if (!(slot in hooks)) hooks[slot] = typeof initial === 'function' ? initial() : initial;
      return [hooks[slot], value => {
        hooks[slot] = typeof value === 'function' ? value(hooks[slot]) : value;
      }];
    },
    useRef(value) {
      const slot = hook++;
      if (!(slot in hooks)) hooks[slot] = {current:value};
      return hooks[slot];
    },
    useMemo(build) {hook++;return build();},
    useEffect(effect, deps) {
      const slot = hook++, previous = hooks[slot];
      if (previous?.deps?.length === deps.length &&
        previous.deps.every((value, i) => Object.is(value, deps[i]))) return;
      if (previous?.cleanup) previous.cleanup();
      pending.push(() => {
        const cleanup = effect();
        hooks[slot] = {deps,cleanup};
      });
    },
  };
  const account = {id:'owner',username:'saad'};
  const savedWorks = [
    {id:'barcode',title:'باركود',kind:'series',archivedAt:null},
    {id:'outside-story',title:'خارج الستوري',kind:'series',archivedAt:null},
  ];
  const requests = [];
  async function requestStudio(path, options={}) {
    requests.push({path,method:options.method||'GET'});
    assert.equal(path, '/api/projects');
    assert.equal(options.method||'GET','GET');
    return Response.json({account,projects:savedWorks});
  }
  const Component = createStudioWorks({React,Studio});
  let tree;
  function render() {
    hook=0;
    tree=Component({account,requestStudio,onSignOut(){}});
    for (const effect of pending.splice(0)) effect();
    return tree;
  }
  function descendants(node=tree) {
    if (!node || typeof node !== 'object') return [];
    return [node, ...(node.children||[]).flat(Infinity).flatMap(descendants)];
  }
  function finish() {
    for(const entry of hooks) if(entry?.cleanup) entry.cleanup();
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
  return {render, descendants, finish, requests, Studio, get tree(){return tree;},
    get href(){return href;}};
}

test('old work link lands on account Works rather than silently opening Barcode', async () => {
  const h = createHarness('https://q8-ux.github.io/saad/family-online-studio/?work=barcode');
  try {
    assert.equal(h.render().type, 'main');
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(h.render().type, 'main');
    assert.equal(new URL(h.href).searchParams.has('work'),false);
    const titles=h.descendants().filter(n=>n.type==='strong').flatMap(n=>n.children);
    assert.ok(titles.includes('باركود'));
    assert.ok(titles.includes('خارج الستوري'));
    assert.equal(h.requests.filter(req=>req.method==='GET').length,1);
    const open = h.descendants().find(n=>n.type==='button' && n.children.includes('فتح'));
    assert.ok(open,'Work list must expose manual open actions');
    open.props.onClick();
    const editor=h.render();
    assert.equal(editor.type, h.Studio);
    assert.equal(editor.props.requestedWork,'barcode');
    editor.props.onWorks();
    assert.equal(h.render().type,'main');
    assert.equal(new URL(h.href).searchParams.has('work'),false);
  } finally {
    h.finish();
  }
});

test('a direct entry without work query also opens Works first', async () => {
  const h = createHarness('https://q8-ux.github.io/saad/family-online-studio/');
  try {
    h.render();
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(h.render().type,'main');
    assert.equal(new URL(h.href).pathname,'/saad/family-online-studio/');
  } finally {
    h.finish();
  }
});
