import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/management/admin.js',import.meta.url),'utf8');
function harness(){
 const nodes=new Map(),calls=[],downloads=[],blobs=[],events=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',setAttribute(){},removeAttribute(){},classList:{toggle(){}},addEventListener(){},showModal(){},replaceChildren(){}});return nodes.get(id);};
 class ReviewURL extends URL {static createObjectURL(blob){blobs.push(blob);return 'blob:synthetic-review';}static revokeObjectURL(){}}
 const memo={id:'synthetic-memo',client_name:'طرف اصطناعي',input_json:'وقائع اصطناعية ثابتة',output_text:'الوقائع\nنص اختبار '+ 'طويل '.repeat(500),edit:{editable:true,revision:0,hash:'a'.repeat(64)}};
 const context=vm.createContext({URL:ReviewURL,URLSearchParams,AbortSignal,Blob,Intl,Date,console,setTimeout(){},clearTimeout(){},setInterval(){},sessionStorage:{getItem:()=>null},location:{},history:{},document:{getElementById:node,addEventListener:(name,f)=>events.set(name,f),createElement:()=>({href:'',download:'',click(){downloads.push({href:this.href,download:this.download});}})},fetch:async(url,init)=>{calls.push({url:String(url),init});if(String(url).includes('memo-revision'))return Response.json({revision:{revision:1,before_text:'نص أصلي اصطناعي',after_text:'نص مصحح اصطناعي'}});if(String(url).includes('memos?id='))return Response.json({memo});return Response.json({memos:[{id:memo.id}],hasMore:false,officialAvailable:false});}});
 vm.runInContext(source.replace('void boot();',`manager={role:'administrator'};globalThis.review={openMemo,editMemo,exportMemosForReview,showMemoVersion,setRole:role=>manager={role}};`),context);
 return{api:context.review,node,calls,downloads,blobs,memo};
}
test('existing memo viewer opens RTL editor with full text and history; staff receive no edit controls',async()=>{
 const h=harness();await h.api.openMemo(h.memo.id);assert.match(h.node('detail-content').innerHTML,/تعديل نص المذكرة/);h.api.editMemo();const html=h.node('detail-content').innerHTML;assert.match(html,/name="text" dir="rtl"/);assert.ok(html.includes(h.memo.output_text));assert.match(html,/حفظ نسخة مصححة/);
 await h.api.showMemoVersion(1);assert.match(h.node('detail-content').innerHTML,/نص أصلي اصطناعي/);assert.match(h.node('detail-content').innerHTML,/نص مصحح اصطناعي/);
 h.api.setRole('reviewer');await h.api.openMemo(h.memo.id);assert.doesNotMatch(h.node('detail-content').innerHTML,/data-memo-edit/);
});
test('review export includes untruncated memo and inputs, downloads locally and makes no write request',async()=>{
 const h=harness();await h.api.exportMemosForReview({textContent:''});assert.equal(h.downloads.length,1);const data=JSON.parse(await h.blobs[0].text());assert.equal(data.format,'sabeq-memo-review-export-1');assert.equal(data.records[0].output_text,h.memo.output_text);assert.equal(data.records[0].input_json,h.memo.input_json);assert.ok(h.calls.every(c=>(c.init.method||'GET')==='GET'));assert.ok(h.calls.every(c=>!c.url.includes('gmail')));assert.ok(!JSON.stringify(data).includes('authorization'));
});
