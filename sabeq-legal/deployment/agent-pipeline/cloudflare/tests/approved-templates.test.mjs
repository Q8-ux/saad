import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {templateHarness,load} from './template-harness.mjs';
const doc=load('../lib/pleading-document.ts');
const input={caseType:'مدني',court:'المحكمة الكلية',courtCircuit:'مدني كلي',caseNumber:'0012/2026',clientName:'سالم التجريبي',partyRole:'مدعٍ',otherParty:'ناصر الافتراضي',facts:'لم يسدد ناصر الافتراضي مبلغ 00500.250 دينار المستحق لسالم التجريبي بتاريخ 01/02/2026.',requests:'إلزام المدعى عليه برد مبلغ 00500.250 دينار.',clientAddress:'عنوان اختبار أ',otherAddress:'عنوان اختبار ب'};
const content={facts:input.facts,requests:input.requests,grounds:'',legalResearchNotes:'لا توجد مصادر موثقة كافية؛ يتولى المساعد والمجموعة استكمال البحث.',factualNotes:[],fields:{}};

test('both reviewed originals persist byte-for-byte in R2 and authoritative definitions in actual SQLite, idempotently',async t=>{
 const h=templateHarness();t.after(h.cleanup);await h.templates.ensureApprovedTemplates();assert.equal(h.objects.size,2);assert.equal(h.sql('SELECT count(*) AS n FROM legal_drafting_templates')[0].n,2);
 for(const row of h.sql('SELECT * FROM legal_drafting_templates')){const original=h.objects.get(row.source_object_key);assert.equal(createHash('sha256').update(original.bytes).digest('hex'),row.source_sha256);assert.equal(row.status,'approved');const def=JSON.parse(row.definition_json);assert.ok(def.clauses.processServer);assert.equal(def.kind,row.kind);}
 h.sql("UPDATE legal_drafting_templates SET title='عنوان محفوظ من الإدارة' WHERE kind='claim'");await h.templates.ensureApprovedTemplates();assert.equal(h.writes,2);assert.equal((await h.templates.loadApprovedTemplate('claim')).info.title,'عنوان محفوظ من الإدارة');
 h.sql("UPDATE legal_drafting_templates SET status='withdrawn' WHERE kind='claim'");await assert.rejects(h.templates.loadApprovedTemplate('claim'),/القالب المعتمد غير متاح/);
});
test('failed source persistence does not create a falsely approved record',async t=>{
 const h=templateHarness();t.after(h.cleanup);h.bucket.put=async()=>{throw Error('synthetic storage outage');};await assert.rejects(h.templates.ensureApprovedTemplates());assert.equal(h.sql('SELECT count(*) AS n FROM legal_drafting_templates')[0].n,0);
});
test('claim keeps fixed preamble and identifiers; appeal keeps four ordered sections and correct original party role',async t=>{
 const h=templateHarness();t.after(h.cleanup);const claim=await h.templates.loadApprovedTemplate('claim'),appeal=await h.templates.loadApprovedTemplate('appeal');
 const first=doc.buildPleadingDocument(claim.info,claim.definition,'claim',input,content);const text=doc.pleadingText(first);for(const term of ['صحيفة الدعوى','بناءً على طلب/','قد انتقلت وأعلنت صورة','الموضوع والطلبات','بناءً عليه','0012/2026','00500.250','01/02/2026'])assert.ok(text.includes(term),term);assert.doesNotMatch(text,/2020|٢٠٢٠|هاتف رقم|المادة\s*18|غير معتمدة|ملاحظات المراجعة|مراجعة المسودة|المساعد/);
 const second=doc.buildPleadingDocument(appeal.info,appeal.definition,'appeal',{...input,court:'محكمة الاستئناف',partyRole:'مستأنف',judgmentNumber:'0045/2026',judgmentDate:'15/09/2026',judgmentOperative:'حكم اصطناعي للاختبار.',originalPlaintiff:input.otherParty,originalDefendant:input.clientName},content);
 assert.equal(second.pages.length,4);assert.match(second.pages[1].blocks[0].text,/المقامة من ناصر الافتراضي ضد سالم التجريبي/);assert.ok(second.pages[2].blocks.some(b=>b.text==='أسباب الاستئناف'));assert.equal(second.pages[3].blocks[0].text,'لذلك');assert.doesNotMatch(doc.pleadingText(second),/إلزام المستأنف بالمصروفات/);
 assert.equal(doc.selectPleadingKind({...input,partyRole:'مستأنف ضده',court:'محكمة الاستئناف'}),'memorandum');assert.equal(doc.selectPleadingKind({...input,partyRole:'مستأنف',court:'محكمة الاستئناف'}),'appeal');assert.equal(doc.selectPleadingKind({...input,court:'محكمة التمييز'}),'memorandum');
 mkdirSync(new URL('../tmp/template-qa/',import.meta.url),{recursive:true});for(const [name,value] of [['claim',first],['appeal',second]]){writeFileSync(new URL(`../tmp/template-qa/${name}.json`,import.meta.url),JSON.stringify(value));writeFileSync(new URL(`../tmp/template-qa/${name}.html`,import.meta.url),doc.renderPleadingHtml(value));}
});
test('preview escapes hostile content and never drops long case text',async t=>{
 const h=templateHarness();t.after(h.cleanup);const template=await h.templates.loadApprovedTemplate('claim');const long='واقعة اصطناعية طويلة '.repeat(1500)+'النهاية المحفوظة';const result=doc.buildPleadingDocument(template.info,template.definition,'claim',{...input,clientName:'<script>alert(1)</script>'},{...content,facts:long});const html=doc.renderPleadingHtml(result);assert.doesNotMatch(html,/<script>|onerror=/);assert.match(html,/&lt;script&gt;/);assert.ok(html.includes(long));assert.doesNotMatch(html,/chatgpt|مراجعة المسودة|ملاحظات المراجعة|المساعد|غير معتمدة/);
});
test('Word exports open as real OOXML with Arabic text, embedded original emblems and section page breaks',async t=>{
 const h=templateHarness();t.after(h.cleanup);const template=await h.templates.loadApprovedTemplate('appeal'),value=doc.buildPleadingDocument(template.info,template.definition,'appeal',{...input,partyRole:'مستأنف',court:'محكمة الاستئناف'},content);const exporter=load('../lib/pleading-docx.ts');const bytes=exporter.exportPleadingDocx(value);
 const validation=spawnSync('python',['-c',`import io,sys,zipfile,xml.etree.ElementTree as E
from docx import Document
b=sys.stdin.buffer.read();z=zipfile.ZipFile(io.BytesIO(b));assert z.testzip() is None
for n in z.namelist():
 if n.endswith('.xml') or n.endswith('.rels'): E.fromstring(z.read(n))
d=Document(io.BytesIO(b));x=z.read('word/document.xml').decode();assert '00500.250' in x;assert 'سالم التجريبي' in x;assert '<w:bidi/>' in x;assert x.count('<w:pageBreakBefore/>')==3;assert 'مراجعة المسودة' not in x;assert 'المساعد' not in x;assert 'غير معتمدة' not in x;assert len(d.inline_shapes)==1;assert len(d.tables)==2;print('valid DOCX')`],{input:bytes});assert.equal(validation.status,0,validation.stderr.toString());writeFileSync(new URL('../tmp/template-qa/appeal.docx',import.meta.url),bytes);
 const claim=await h.templates.loadApprovedTemplate('claim');writeFileSync(new URL('../tmp/template-qa/claim.docx',import.meta.url),exporter.exportPleadingDocx(doc.buildPleadingDocument(claim.info,claim.definition,'claim',input,content)));
});
test('originals cannot be read without real server admin authorization',async()=>{
 let reads=0;const auth=load('../lib/admin-service-auth.ts',{'cloudflare:workers':{env:{ADMIN_SERVICE_TOKEN:'a'.repeat(48)}}});const route=load('../app/api/admin/templates/route.ts',{'@/lib/admin-service-auth':auth,'@/lib/approved-templates':{listApprovedTemplates:async()=>{reads++;return[];},readApprovedTemplateOriginal:async()=>{reads++;return null;}}});
 for(const headers of [{},{Authorization:'Bearer '+'b'.repeat(48)}])assert.equal((await route.GET(new Request('https://example.org/api/admin/templates?id=sabeq-claim-20261001-v1',{headers}))).status,401);assert.equal(reads,0);
});

test('generation uses stored template and structured content, retains sources and rejects malformed completion',async t=>{
 const h=templateHarness();t.after(h.cleanup);let malformed=false,calls=0,record;
 const search=load('../lib/legal-search.ts',{'@/db':{}});
 const route=load('../app/api/legal/memo/route.ts',{
  '@/lib/approved-templates':h.templates,
  '@/lib/sabeq-agent-bridge':{agentPipelineEnabled:()=>false},
  '@/lib/legal-search':{...search,searchLegalEvidenceAcross:async()=>[{documentId:1,title:'دليل اصطناعي',reference:'نص اختبار',text:'مصدر اصطناعي',documentType:'قانون',officialSource:'اختبار',sourceUrl:'https://example.org/source'}],searchCassationEvidenceAcross:async()=>[],readHandoffEvidence:async()=>[]},
  '@/lib/openai':{deriveLegalResearchPlan:async()=>({searchQueries:[],legalIssues:[]}),openAIErrorResponse:()=>null,generateText:async options=>{calls++;assert.equal(options.schema.additionalProperties,false);assert.match(options.instructions,/لا تُنشئ ترويسة أو ديباجة/);return malformed?'incomplete':JSON.stringify({...content,grounds:'تطبيق على واقعة اصطناعية 【م1】',fields:{judgmentNumber:'0045/2026'},factualNotes:['أرفق النص القانوني','عنوان الخصم غير واضح']});}},
  '@/lib/public-auth':{requireMemoUserOrGuest:async()=>({id:'synthetic-user'})},'@/lib/service-settings':{requireServiceEnabled:async()=>{}},'@/lib/service-records':{enforceUserServiceLimit:async()=>{},recordServiceActivity:async value=>{record=value;}},'@/lib/request-security':{...h.security,enforceRateLimit:async()=>{}}
 });
 const request=()=>new Request('https://example.org/api/legal/memo',{method:'POST',headers:{Origin:'https://example.org','Content-Type':'application/json'},body:JSON.stringify({...input,partyRole:'مستأنف',court:'محكمة الاستئناف',judgmentNumber:'0012/2026'})});
 const response=await route.POST(request());assert.equal(response.status,200);const result=await response.json();assert.equal(result.document.kind,'appeal');assert.equal(result.document.pages.length,4);assert.equal(result.template.sourceFilename,'appeal.pdf');assert.ok(result.document.pages[0].sidebar.some(b=>b.text.includes('0012/2026')));assert.equal(result.analysis.sources[0].sourceUrl,'https://example.org/source');assert.doesNotMatch(result.memo,/أرفق النص القانوني/);assert.equal(record.metadata.template.id,result.template.id);assert.equal(record.metadata.document,undefined);
 malformed=true;const failure=await route.POST(request());assert.equal(failure.status,503);assert.equal((await failure.json()).memo,undefined);assert.equal(calls,2);
});
