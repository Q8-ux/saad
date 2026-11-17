const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
const enhanced=fs.readFileSync(path.join(root,'enhanced.js'),'utf8');

function environment({initial={},blocked=false,fetch=async()=>{throw Error('unexpected network')}}={}) {
  const data=new Map(Object.entries(initial)), nodes=new Map(), blobs=[];
  const storage={getItem:key=>{if(blocked)throw Error('storage blocked');return data.get(key)||null},setItem:(key,value)=>{if(blocked)throw Error('storage blocked');data.set(key,value)}};
  function element(){return {value:'',textContent:'',hidden:true,disabled:false,style:{},children:[],attributes:{},
    classList:{add(){},remove(){},toggle(){}},replaceChildren(){this.children=[]},appendChild(child){this.children.push(child)},
    append(...children){this.children.push(...children)},setAttribute(key,value){this.attributes[key]=value},
    focus(){},scrollIntoView(){},click(){this.onclick?.()},remove(){}}}
  const document={getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)},createElement:element,body:element()};
  for(const id of html.matchAll(/\bid="([^"]+)"/g))document.getElementById(id[1]);
  document.getElementById('demoData').textContent=html.match(/<script type="application\/json" id="demoData">([\s\S]*?)<\/script>/)[1];
  for(const [id,value] of Object.entries({aud:'المبتدئون',duration:'8',format:'شرح خطوة بخطوة'}))document.getElementById(id).value=value;
  const context=vm.createContext({document,localStorage:storage,sessionStorage:storage,fetch,AbortController,Blob,console,
    setTimeout(){return 1},clearTimeout(){},URL:{createObjectURL(blob){blobs.push(blob);return 'blob:test'},revokeObjectURL(){}},
    navigator:{clipboard:{async writeText(){}}},crypto:{randomUUID(){return 'new-project'}},window:{scrollTo(){}}});
  vm.runInContext(source,context);vm.runInContext(enhanced,context);
  return {context,nodes,data,blobs,run:code=>vm.runInContext(code,context)};
}
test('ready example exports its real seven-part script and restores saved edits',async()=>{
  const e=environment(); e.nodes.get('runDemo').click();
  assert.match(e.nodes.get('output').textContent,/المقطع 7/);
  assert.equal(Object.keys(e.run('current')).length,8);
  e.nodes.get('editOutput').click(); e.nodes.get('editor').value+='\nتحرير محفوظ';e.nodes.get('saveOutput').click();
  const reopened=environment({initial:Object.fromEntries(e.data)});
  const row=reopened.nodes.get('history').children[0];row.children[1].click();
  assert.match(reopened.run("current['السكربت الكامل']"),/تحرير محفوظ/);
  reopened.nodes.get('exportJson').click();
  const exported=JSON.parse(await reopened.blobs[0].text());
  assert.equal(exported.status,'planning_only');assert.equal(exported.video_rendered,false);
  assert.equal(exported.fields.duration,'2.5');assert.match(exported.outputs['السكربت الكامل'],/تحرير محفوظ/);
});
test('blocked or corrupted storage never prevents the example from opening',()=>{
  for(const options of [{blocked:true},{initial:{ytProjects:'broken JSON'}}]){
    const e=environment(options);e.nodes.get('runDemo').click();
    assert.match(e.nodes.get('output').textContent,/المقطع 7/);
    assert.equal(e.nodes.get('score').textContent,'مسودة');
  }
});
test('YouTube lookup failure does not suppress a successful text generation',async()=>{
  const calls=[];const e=environment({initial:{yt_youtube:'test-youtube',yt_openai:'test-generation'},fetch:async(url)=>{
    calls.push(url);
    if(url.includes('googleapis'))return {ok:false};
    return {ok:true,json:async()=>({output_text:JSON.stringify({'العنوان':'عنوان مخصص','الهوك والسيناريو':'نص مولد للاختبار'})})};
  }});
  for(const [id,value] of Object.entries({topic:'موضوع اختبار',niche:'تعليم',keyword:'كلمة اختبار'}))e.nodes.get(id).value=value;
  await e.nodes.get('generate').onclick();
  assert.equal(calls.length,2);assert.equal(e.run("current['العنوان']"),'عنوان مخصص');
  assert.equal(e.nodes.get('generate').disabled,false);assert.equal(e.nodes.get('runDemo').disabled,false);
  const archive=JSON.parse(e.data.get('ytProjects'));
  assert.equal(archive.length,1);assert.ok(!JSON.stringify(archive).includes('test-generation'));
});
