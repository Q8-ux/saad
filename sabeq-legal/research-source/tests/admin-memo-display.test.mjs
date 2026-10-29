import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/management/admin.js',import.meta.url),'utf8');
function fixture(record,status=200) {
  const events=new Map(),calls=[],nodes=new Map();
  function node(id) {
    if(!nodes.has(id)) {const classes=new Set(),attributes=new Map();nodes.set(id,{innerHTML:'',textContent:'',hidden:true,open:false,scrollTop:0,
      classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);},contains:name=>classes.has(name)},
      setAttribute:(key,value)=>attributes.set(key,value),removeAttribute:key=>attributes.delete(key),getAttribute:key=>attributes.get(key),
      addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},replaceChildren(){this.innerHTML='';}});}
    return nodes.get(id);
  }
  const document={getElementById:node,addEventListener:(name,handler)=>events.set(name,handler),querySelector:()=>null,querySelectorAll:()=>[],hidden:false};
  vm.runInNewContext(source,{document,sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},location:{href:'https://preview.example.invalid/management/',pathname:'/management/'},history:{replaceState(){}},URL,URLSearchParams,AbortSignal,Intl,Date,console,setInterval(){},setTimeout(){},clearTimeout(){},fetch:async(url,init)=>{calls.push({url,init});return Response.json(status===200?{memo:record}:{error:'غير مصرح.'},{status});}});
  const click=async dataset=>{events.get('click')({target:{closest:()=>({dataset,disabled:false,hasAttribute:()=>false})}});await new Promise(resolve=>setImmediate(resolve));};
  return {open:async(id='synthetic-record')=>{await click({memo:id});return node('detail-content').innerHTML;},close:()=>click({action:'close-dialog'}),node,calls};
}
const base={client_name:'طلب اصطناعي',case_type:'مدني',status:'needs_review',created_at:'2026-10-29 01:00:00'};
test('request fields use Arabic labels, omit empty/technical values and keep long identifiers',async()=>{
  const f=fixture({...base,input_json:JSON.stringify({clientName:'اسم اصطناعي',civilId:'123456789012',clientAddress:'',court:'محكمة اختبار',requests:'رفض المطالبة الاصطناعية',draftMode:'internal-marker',paymentToken:'synthetic-secret-must-not-display'}),output_text:'نص محفوظ اصطناعي'});
  const html=await f.open();assert.match(html,/<dt>الرقم المدني<\/dt>/);assert.match(html,/123456789012/);assert.match(html,/محكمة اختبار/);assert.doesNotMatch(html,/civilId|clientAddress|عنوان مقدم المذكرة|draftMode|internal-marker|paymentToken|synthetic-secret|<pre>/);assert.equal(f.node('detail').getAttribute('aria-labelledby'),'memo-detail-title');assert.equal(f.node('detail').classList.contains('memo-detail'),true);
});
test('legacy escaped line breaks become paragraphs and headings without changing stored text',async()=>{
  const original='أولاً: الوقائع\\n\\nنص اصطناعي مع رقم 123 واسم «طرف اختباري».\\nثانياً: الطلبات\\nرفض المطالبة.';
  const record={...base,input_json:'وصف طلب اصطناعي قديم',output_text:original};const html=await fixture(record).open();
  assert.match(html,/<h4>أولاً: الوقائع<\/h4>/);assert.match(html,/<p>نص اصطناعي مع رقم 123 واسم «طرف اختباري»\.<\/p>/);assert.match(html,/<h4>ثانياً: الطلبات<\/h4>/);assert.doesNotMatch(html,/\\n/);assert.equal(record.output_text,original);
});
test('double-encoded historical JSON is decoded into readable fields and a memo body',async()=>{
 const html=await fixture({...base,input_json:JSON.stringify(JSON.stringify({fields:{facts:'وقائع اصطناعية',requests:'طلب اصطناعي'}})),output_text:JSON.stringify(JSON.stringify({memo:'## مذكرة اختبار\\nفقرة أولى\\nفقرة ثانية'}))}).open();assert.match(html,/وقائع اصطناعية/);assert.match(html,/<h4>مذكرة اختبار<\/h4>/);assert.match(html,/<p>فقرة ثانية<\/p>/);assert.doesNotMatch(html,/"memo"|"fields"|\\n/);
});
test('structured saved pleadings retain facts, legal prose and requested relief',async()=>{
 const html=await fixture({...base,input_json:'وقائع محفوظة',output_text:JSON.stringify({facts:'وقائع اختبار كاملة',grounds:'دفاع اختبار كامل',requests:'طلبات اختبار كاملة'})}).open();for(const value of ['وقائع اختبار كاملة','دفاع اختبار كامل','طلبات اختبار كاملة'])assert.ok(html.includes(value));assert.match(html,/<h4>الدفاع والأسانيد<\/h4>/);
});
test('HTML in names, request fields and memo text remains text',async()=>{
 const attack='<img src=x onerror=alert(1)>';const html=await fixture({...base,client_name:attack,input_json:JSON.stringify({facts:attack}),output_text:'## عنوان اختبار\n'+attack,error_code:'private-internal-code'}).open();assert.doesNotMatch(html,/<img|<script|private-internal-code/);assert.equal((html.match(/&lt;img/g)||[]).length,3);
});
test('empty and corrupt records have readable Arabic states rather than raw objects',async()=>{
 const empty=await fixture({...base,input_json:null,output_text:null}).open();assert.match(empty,/لا توجد بيانات طلب/);assert.match(empty,/لم ينتج هذا الطلب/);assert.doesNotMatch(empty,/undefined|\[object Object\]/);
 const corrupt=await fixture({...base,input_json:'{"civilId":broken',output_text:'{"memo":broken'}).open();assert.match(corrupt,/تعذرت قراءة/);assert.doesNotMatch(corrupt,/civilId|broken/);
});
test('hosted, official and legacy records use the same safe viewer and closing clears case content',async()=>{
 for(const id of ['synthetic-hosted','official:synthetic','legacy:synthetic']) {const f=fixture({...base,input_json:JSON.stringify({facts:'وقائع اختبار'}),output_text:'مذكرة اختبار'});await f.open(id);assert.equal(f.node('detail').open,true);assert.equal(f.calls[0].url,'https://sabeq-legal-public.centrino.chatgpt.site/api/management/memos?id='+encodeURIComponent(id));await f.close();assert.equal(f.node('detail').open,false);assert.equal(f.node('detail-content').innerHTML,'');}
});
test('a denied detail response does not open a record or bypass server permissions',async()=>{
 const f=fixture(null,403);await f.open();assert.equal(f.node('detail').open,false);assert.equal(f.node('detail-content').innerHTML,'');assert.equal(f.node('notice').textContent,'غير مصرح.');
});
