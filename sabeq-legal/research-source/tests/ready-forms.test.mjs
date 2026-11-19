import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {load,templateHarness} from './template-harness.mjs';

function blankHarness(){
 const bytes=Buffer.from('%PDF-synthetic-blank-form-only');
 const seed=kind=>({id:'synthetic-approved-'+kind,kind,version:1,title:'قالب اختبار مفرغ',sourceFilename:'synthetic-'+kind+'.pdf',sourceSha256:createHash('sha256').update(bytes).digest('hex'),pdfBase64:bytes.toString('base64'),pageCount:1,approvedAt:'synthetic-approval'});
 return templateHarness({sourceOverrides:{'@/data/drafting-templates/claim-source.json':seed('claim'),'@/data/drafting-templates/appeal-source.json':seed('appeal')}});
}
function api(h){return load('../lib/ready-forms.ts',{'@/db':{getD1:()=>h.database},'./request-security':h.security});}
test('eight classified office drafts contain empty placeholders and no copied case values or source files',async t=>{
 const h=blankHarness();t.after(h.cleanup);const forms=await api(h).listReadyForms();
 assert.equal(forms.length,8);assert.equal(new Set(forms.map(f=>f.kind)).size,8);
 assert.deepEqual(new Set(forms.map(f=>f.category)),new Set(['الطعون','التنفيذ','التظلمات','المستندات','الشكاوى','الإنذارات','الطلبات والأوامر']));
 for(const f of forms){
  assert.equal(f.status,'draft');assert.equal(f.caseDataIncluded,false);assert.equal(f.originalFileStored,false);assert.equal(f.sourceMode,'blank_structure_only');
  assert.ok(f.fields.length>=6);assert.deepEqual(new Set(f.fields),new Set(Array.from(f.content.matchAll(/\{\{([^{}]+)\}\}/g),m=>m[1])));
  assert.doesNotMatch(f.content,/\d|https?:|@|[٠-٩]{3,}/);assert.doesNotMatch(f.content,/<[^>]+>/);
 }
 for(const row of h.sql("SELECT * FROM legal_drafting_templates WHERE status='draft'")){assert.equal(row.source_filename,'');assert.equal(row.source_object_key,'');assert.equal(row.page_count,0);assert.equal(row.approved_by,'');assert.equal(row.approved_at,'');}
 assert.equal(h.objects.size,0);assert.equal(h.writes,0);
});
test('initialization is idempotent and preserves a stored office draft',async t=>{
 const h=blankHarness();t.after(h.cleanup);const store=api(h);await store.listReadyForms();
 h.sql("UPDATE legal_drafting_templates SET title='عنوان هيكلي اختباري محفوظ' WHERE kind='ready_document_inventory'");
 await store.ensureReadyForms();const forms=await store.listReadyForms();assert.equal(forms.length,8);assert.equal(forms.find(f=>f.kind==='document_inventory').title,'عنوان هيكلي اختباري محفوظ');
});
test('office drafts persist beside approved templates and never enter the public template response',async t=>{
 const h=blankHarness();t.after(h.cleanup);
 const route=load('../app/api/legal/templates/route.ts',{'@/lib/service-settings':{requireServiceEnabled:async()=>{}},'@/lib/approved-templates':h.templates,'@/lib/request-security':h.security});
 const response=await route.GET(new Request('https://example.test/api/legal/templates'));assert.equal(response.status,200);const body=await response.json();
 assert.equal(body.templates.length,2);assert.ok(body.templates.every(f=>['claim','appeal'].includes(f.kind)));assert.doesNotMatch(JSON.stringify(body),/sabeq-ready-form-|blank_structure_only/);
 assert.equal(h.sql("SELECT count(*) n FROM legal_drafting_templates WHERE status='draft'")[0].n,8);assert.equal(h.objects.size,2);
});
test('malformed stored office content fails explicitly instead of being displayed as an empty or approved form',async t=>{
 const h=blankHarness();t.after(h.cleanup);const store=api(h);await store.ensureReadyForms();
 h.sql("UPDATE legal_drafting_templates SET definition_json='{}' WHERE kind='ready_criminal_complaint'");await assert.rejects(store.listReadyForms(),/تعذر قراءة الصيغة/);
});

const client=readFileSync(new URL('../public/management/admin.js',import.meta.url),'utf8');
async function fixture({signedIn=true,forms=[],role='administrator',section='forms'}={}){
 const nodes=new Map(),events=new Map(),calls=[];
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',open:false,classList:{toggle(){},remove(){}},addEventListener(){},focus(){},setAttribute(){},removeAttribute(){},showModal(){this.open=true;}});return nodes.get(id);};
 vm.runInNewContext(client,{document:{getElementById:node,addEventListener:(name,fn)=>events.set(name,fn),querySelectorAll:()=>[],hidden:false},sessionStorage:{getItem:key=>key==='sabeq-management-session'&&signedIn?'synthetic-office-session':null,setItem(){},removeItem(){}},location:{href:'https://example.test/#'+section,hash:'#'+section,pathname:'/'},history:{replaceState(){}},URL,URLSearchParams,AbortSignal,Intl,Date,console,setTimeout(){},clearTimeout(){},setInterval(){},fetch:async(url,init)=>{calls.push({url,init});return Response.json(url.endsWith('/session')?{manager:{role,sections:role==='administrator'?['overview','memos','forms']:['memos','bookings','inbox']}}:url.endsWith('/ready-forms')?{forms}:{memos:[],hasMore:false});}});
 await new Promise(resolve=>setImmediate(resolve));
 return{node,calls,async click(id){await events.get('click')({target:{closest:()=>({dataset:{readyForm:id},hasAttribute:()=>false,disabled:false})}});}};
}
test('the admin forms section displays all classified drafts and keeps the five-second memo polling client',async t=>{
 const h=blankHarness();t.after(h.cleanup);const forms=await api(h).listReadyForms();const f=await fixture({forms});
 assert.match(f.node('app').innerHTML,/data-section="forms"/);assert.match(f.node('workspace').innerHTML,/الصيغ المصنفة/);
 for(const form of forms)assert.ok(f.node('workspace').innerHTML.includes(form.title));
 const call=f.calls.find(c=>c.url.endsWith('/ready-forms'));assert.equal(call.init.headers.Authorization,'Bearer synthetic-office-session');
 await f.click(forms[0].id);assert.equal(f.node('detail').open,true);assert.match(f.node('detail-content').innerHTML,/readonly/);assert.ok(f.node('detail-content').innerHTML.includes(forms[0].content));
 assert.match(client,/setInterval\([\s\S]*5_000\)/);
});
test('an office form is escaped as text in both the list and the viewer',async()=>{
 const f=await fixture({forms:[{id:'synthetic-form',title:'<script>test</script>',category:'<svg>',status:'draft',fields:[],content:'<img src=x onerror="test">'}]});
 assert.doesNotMatch(f.node('workspace').innerHTML,/<script>|<svg>/);await f.click('synthetic-form');assert.match(f.node('detail-content').innerHTML,/&lt;img/);assert.doesNotMatch(f.node('detail-content').innerHTML,/<img/);
});
test('signed-out users and memo-supervisor navigation cannot read the office form catalog',async()=>{
 const guest=await fixture({signedIn:false});assert.equal(guest.calls.length,0);assert.doesNotMatch(guest.node('app').innerHTML,/data-section="forms"/);
 const supervisor=await fixture({role:'memo_supervisor'});assert.ok(!supervisor.calls.some(c=>c.url.endsWith('/ready-forms')));assert.doesNotMatch(supervisor.node('app').innerHTML,/data-section="forms"/);
});
