import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/management/admin.js',import.meta.url),'utf8');
async function render(connection,archiveAvailable=false,section='overview') {
  const nodes=new Map(),calls=[];
  const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',classList:{toggle(){}},addEventListener(){},focus(){}});return nodes.get(id);};
  const snapshot={connection,memo:{total:2,review:1},historical:{total:1},contacts:{unread:0},mail:{unread:0},commands:{pending:0},appointments:{total:0,pending:0},notifications:[],official:{available:archiveAvailable,totals:archiveAvailable?{memos:4}:null,error:archiveAvailable?null:'HTTP 404'},updatedAt:'2026-10-29T02:00:00Z'};
  vm.runInNewContext(source,{document:{getElementById:node,addEventListener(){},querySelectorAll:()=>[],hidden:false},
    sessionStorage:{getItem:key=>key==='sabeq-management-session'?'synthetic-only':null,setItem(){},removeItem(){}},
    location:{href:'https://preview.invalid/#'+section,hash:'#'+section,pathname:'/'},history:{replaceState(){}},
    URL,URLSearchParams,AbortSignal,Intl,Date,console,setTimeout(){},clearTimeout(){},setInterval(){},
    fetch:async url=>{calls.push(url);const path=new URL(url).pathname;return Response.json(path.endsWith('/session')?{manager:{role:'administrator'}}:path.endsWith('/updates')?{available:true,commits:[]}:snapshot);}});
  await new Promise(resolve=>setImmediate(resolve));
  return {html:node('workspace').innerHTML,calls};
}
const connected={available:true,source:'sabeq-public-service',mode:'shared-database',checkedAt:'2026-10-29T02:00:00Z'};
test('the current shared source remains connected while the unavailable previous archive is explicit',async()=>{
  const {html,calls}=await render(connected);
  assert.match(html,/<strong>الموقع الرسمي ولوحة التحكم<\/strong>[\s\S]*?قاعدة بيانات مشتركة[\s\S]*?<span class="badge ">متصل<\/span>/);
  assert.match(html,/<strong>أرشيف الخدمة السابقة<\/strong>[\s\S]*?غير متاح/);
  assert.match(html,/قد توجد سجلات أقدم غير معروضة/);assert.doesNotMatch(html,/خدمة الموقع الرسمي|تعذر الاتصال بجسر المتابعة|HTTP 404/);
  assert.ok(calls.some(url=>url.endsWith('/snapshot')));
});
test('missing or unsupported source evidence is never rendered as a connected current site',async()=>{
  for(const connection of [undefined,{...connected,available:false},{...connected,source:'unknown'}]){
    const {html}=await render(connection);const current=html.split('<strong>الموقع الرسمي ولوحة التحكم</strong>')[1].split('<strong>أرشيف الخدمة السابقة</strong>')[0];
    assert.match(current,/لم يُتحقق/);assert.doesNotMatch(current,/>متصل</);
  }
});
test('a reachable archive stays distinct and the updates page uses the same current-source evidence',async()=>{
  const online=await render(connected,true);assert.match(online.html,/جسر الأرشيف السابق متصل/);assert.doesNotMatch(online.html,/تعذر جلب أرشيف/);
  const updates=await render(connected,false,'updates');assert.match(updates.html,/الموقع الرسمي ولوحة التحكم/);assert.match(updates.html,/أرشيف الخدمة السابقة/);assert.doesNotMatch(updates.html,/جسر الموقع الرسمي/);
});
