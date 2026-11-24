import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudioWorks} from '../assets/studio-works.mjs';

function createHarness(startUrl, options = {}) {
  const originalWindow = globalThis.window;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const cache = new Map(Object.entries(options.cache || {}));
  const storage = {getItem:key=>cache.get(key)||null,setItem:(key,value)=>cache.set(key,value)};
  Object.defineProperty(globalThis,"localStorage",{configurable:true,value:storage});
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
  const account = options.account || {id:'owner',username:'saad'};
  const savedWorks = options.projects || [
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
    if(originalStorage)Object.defineProperty(globalThis,"localStorage",originalStorage);
    else delete globalThis.localStorage;
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


test('an explicit writing link opens only the requested authenticated work', async()=>{
 const h=createHarness('https://q8-ux.github.io/saad/family-online-studio/?view=writer&work=outside-story');
 try{h.render();await new Promise(r=>setTimeout(r,0));const editor=h.render();assert.equal(editor.type,h.Studio);assert.equal(editor.props.requestedWork,'outside-story');assert.equal(h.requests.length,1);assert.equal(h.requests[0].method,'GET');editor.props.onWorks();h.render();assert.equal(new URL(h.href).searchParams.has('view'),false);}finally{h.finish();}
});
test('writing entry offers a compact work selector without opening the file archive', async()=>{
 const h=createHarness('https://q8-ux.github.io/saad/family-online-studio/?view=writer');
 try{h.render();await new Promise(r=>setTimeout(r,0));h.render();assert.ok(h.descendants().some(n=>n.type==='h1'&&n.children.includes('صفحة الكتابة')));assert.ok(!h.descendants().some(n=>n.type==='nav'||n.type==='strong'));const chooser=h.descendants().find(n=>n.type==='select'&&n.props.id==='writer-work');assert.ok(chooser);chooser.props.onChange({target:{value:'outside-story'}});const editor=h.render();assert.equal(editor.type,h.Studio);assert.equal(editor.props.requestedWork,'outside-story');}finally{h.finish();}
});
test('writing entry restores the last chosen work of this account only',async()=>{
 const h=createHarness('https://q8-ux.github.io/saad/family-online-studio/?view=writer',{cache:{'fo-studio-last-writer:owner':'outside-story','fo-studio-last-writer:other':'barcode'}});
 try{h.render();await new Promise(r=>setTimeout(r,0));const editor=h.render();assert.equal(editor.type,h.Studio);assert.equal(editor.props.requestedWork,'outside-story');}finally{h.finish();}
});
test('a foreign or archived writing target does not silently open another work',async()=>{
 for(const work of ['foreign-project','archived-project']){
  const h=createHarness('https://q8-ux.github.io/saad/family-online-studio/?view=writer&work='+work,{projects:[{id:'own-project',title:'عمل الحساب',archivedAt:null},{id:'archived-project',title:'أرشيف',archivedAt:'2026-01-01'}],cache:{'fo-studio-last-writer:owner':'own-project'}});
  try{h.render();await new Promise(r=>setTimeout(r,0));assert.equal(h.render().type,'main');assert.ok(h.descendants().some(n=>n.props.role==='alert'));assert.ok(!h.descendants().some(n=>n.type==='option'&&n.props.value==='archived-project'));assert.equal(h.requests.length,1);}finally{h.finish();}
 }
});
test('a sole accessible project opens from the writing link while ordinary entry still opens Works',async()=>{
 const options={projects:[{id:'only-work',title:'عمل واحد',archivedAt:null}],cache:{'fo-studio-last-writer:other':'foreign'}};
 for(const intent of [true,false]){
  const h=createHarness('https://q8-ux.github.io/saad/family-online-studio/'+(intent?'?view=writer':''),options);
  try{h.render();await new Promise(r=>setTimeout(r,0));const page=h.render();assert.equal(page.type,intent?h.Studio:'main');if(intent)assert.equal(page.props.requestedWork,'only-work');}finally{h.finish();}
 }
});
