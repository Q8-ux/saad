import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {load,templateHarness} from './template-harness.mjs';
import {createHash} from 'node:crypto';

const caseData=JSON.parse(readFileSync(new URL('./fixtures/synthetic-loan.json',import.meta.url),'utf8'));
const source={chunkId:101,documentId:1,title:'قانون اختباري غير حقيقي',lawNumber:98765,lawYear:2000,text:'نص اصطناعي مخصص لفحص الربط ولا يمثل تشريعاً حقيقياً.',corpus:{scope:'bound_file_only',sourceId:'user-legislation-source',sourceSha256:'8ffeac9838d7101a6776ca689b06ad08401d69850c27969b3b9959a1c40660bd',articleIdentityUnique:true,articleNumber:'12',lawIdentity:{number:98765,year:2000}}};
function harness(options={}){
 const h=templateHarness();
 h.sql("CREATE TABLE management_memo_requests (id TEXT PRIMARY KEY,user_id TEXT,client_name TEXT,email TEXT,case_type TEXT,case_number TEXT,input_json TEXT,output_text TEXT,status TEXT,error_code TEXT,origin TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP)");
 const security={...h.security,enforceRateLimit:async()=>{}};
 const input=load('../lib/memo-input.ts',{'@/lib/request-security':security});
 h.database.batch=async values=>{const results=[];for(const value of values)results.push(await value.all());return results;};
 const repairs=load('../lib/memo-request-repair.ts',{'@/db':{getD1:()=>h.database},'./request-security':security});
 const revisionCalls=[];
 const revisions={memoEditState:async()=>({hash:'a'.repeat(64),revision:0,editable:true}),saveMemoRevision:async data=>{revisionCalls.push(data);h.sql("UPDATE management_memo_requests SET output_text=?,status='needs_review',error_code='manual_revision' WHERE id=?",[data.text,data.id]);return {ok:true,revision:1};}};
 const api=load('../lib/chat-memo-bridge.ts',{
  'cloudflare:workers':{env:{}},'@/db':{getD1:()=>h.database},'./request-security':security,'./memo-input':input,
  './management-memo-revisions':revisions,'./approved-templates':h.templates,'./memo-project':{memoProjectFile:async()=>({entries:[],hasMore:false})},
  './memo-request-repair':repairs,
  './memo-research-instructions':load('../lib/memo-research-instructions.ts'),
  './text-runtime':{resolveTextEnvironment:async()=>({OPENROUTER_API_KEY:'synthetic-key-not-real',OPENROUTER_MODEL:options.model||'meta-llama/llama-test:free',OPENROUTER_ALLOW_PAID_META:options.allowPaid?'approved':''})},
  './meta-memo-review':{MetaMemoReviewError:class extends Error{},reviewMetaMemo:async input=>{options.called=(options.called||0)+1;if(options.fail)throw new Error('synthetic failure');if(options.onReview)options.onReview(h);return {model:options.model||'meta-llama/llama-test:free',content:{...input.openaiDraft,grounds:grounds+(options.invalidCitation?' وتنص المادة 9999 من القانون رقم 98765 لسنة 2000 【م1】.':''),facts:options.changeFacts?'وقائع أخرى غير مأذونة':input.openaiDraft.facts}};}},
  './legal-search':{readHandoffEvidence:async ids=>ids[0]===101?[source]:[],searchLegalEvidenceAcross:async()=>[source],searchCassationEvidenceAcross:async()=>[]},
 });
 const route=load('../app/mcp/route.ts',{'@/lib/chat-memo-bridge':api,'@/lib/request-security':security});
 return {...h,api,route,revisionCalls};
}
const actor={userId:'synthetic-owner-id',email:'owner@example.test'};
const grounds=`1- الدفع الاصطناعي في حدود المطالبة الوهمية
تتمسك عينة الاختبار بحدود المبلغ الأصلي والسداد الجزئي المذكور في الوقائع، وتطلب فحص أصل الإقرار ومقدار كل دفعة وصلتها بالدين محل الاختبار دون افتراض ثبوت أي مستند غير مقروء. ويستند اختبار البرمجيات فقط إلى المصدر الاصطناعي 【م1】. ويقتضي التطبيق فصل أصل الالتزام المزعوم عن مقدار الرصيد، ثم مقابلة كل واقعة بما ورد فعلاً في المدخلات الاصطناعية.
وقد يثار في الاختبار أن وصف الدفعات لا يكفي وحده لتحديد أثرها أو تخصيصها، وأن المطالبة قد تشمل عنصراً آخر لم يظهر في الوصف. وهذا اعتراض افتراضي للاختبار لا ينسب إلى خصم حقيقي، ويستلزم التحقق من تسلسل الوقائع وحدود المستند المتاح قبل بناء النتيجة.
والرد في حدود العينة أن المراجعة المنظمة تبدأ بمطابقة تاريخ كل دفعة ومتلقيها وغرضها بالمبلغ المطالب به، ثم تستبعد أي نتيجة لا يثبتها المدخل. ويظل الجزء غير المدعوم محل منازعة مستقلة، مع الحفاظ على الطلب الأصلي وعدم إنشاء إقرار أو طلب جديد. كما يبين هذا التطبيق أثر الواقعة في الطلب بدلاً من الاكتفاء بتحفظ عام أو تكرار صيغة إنشائية.`;
test('only the verified configured Sites owner can call case tools',()=>{
 const h=harness();try{
  const runtime={SABEQ_CHAT_OWNER_EMAIL:actor.email};
  for(const headers of [{},{'oai-authenticated-user-email':actor.email},{'oai-authenticated-user-email':'other@example.test','oai-authenticated-user-id':'other'}])assert.throws(()=>h.api.requireChatOwner(new Request('https://sabeq.example/mcp',{headers}),runtime),e=>e.status===403);
  const result=h.api.requireChatOwner(new Request('https://sabeq.example/mcp',{headers:{'oai-authenticated-user-email':actor.email,'oai-authenticated-user-id':actor.userId}}),runtime);assert.equal(result.userId,actor.userId);
 }finally{h.cleanup();}
});
test('tool discovery exposes schemas but never case records or credentials',async()=>{
 const h=harness();try{
  const result=await (await h.route.POST(new Request('https://sabeq.example/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})}))).json();
  assert.equal(result.result.tools.length,6);assert.doesNotMatch(JSON.stringify(result),/sk-or|OPENAI_API_KEY|سالم الاختباري/);
  const blocked=await h.route.POST(new Request('https://sabeq.example/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'sabeq_read_memo_request',arguments:{requestId:'synthetic'}}})}));assert.equal(blocked.status,403);
 }finally{h.cleanup();}
});
test('search returns the exact bound source text and its coverage limits',async()=>{
 const h=harness();try{
  const result=await h.api.chatMemoTool('sabeq_search_legal_sources',{query:'قرض اصطناعي',caseFacts:caseData.facts},actor);
  assert.equal(result.sources[0].sourceId,101);assert.equal(result.sources[0].text,source.text);assert.equal(result.coverage.completeCoverage,false);
 }finally{h.cleanup();}
});
test('chat drafts preserve approved facts and relief and create separate pending records without payment or email',async()=>{
 const h=harness();try{
  const first=await h.api.chatMemoTool('sabeq_save_chat_draft',{caseData,grounds,sourceIds:[101]},actor);
  const second=await h.api.chatMemoTool('sabeq_save_chat_draft',{caseData:{...caseData,clientName:'طرف اصطناعي آخر',caseNumber:'OTHER-SYNTHETIC'},grounds,sourceIds:[101]},actor);
  assert.notEqual(first.requestId,second.requestId);assert.equal(first.status,'needs_review');assert.equal(first.automaticModelReview,false);assert.equal(first.humanReviewRequired,true);
  const row=h.sql('SELECT * FROM management_memo_requests WHERE id = ?',[first.requestId])[0];
  assert.equal(row.email,'');assert.equal(row.error_code,'chat_assisted_draft');assert.equal(row.origin,'chatgpt-mcp');assert.equal(JSON.parse(row.input_json).facts,caseData.facts);assert.equal(JSON.parse(row.input_json).requests,caseData.requests);assert.ok(first.memo.includes(source.text));assert.ok(first.memo.includes(caseData.clientName));assert.doesNotMatch(first.memo,/طرف اصطناعي آخر/);
 }finally{h.cleanup();}
});
test('unknown source IDs and fabricated article numbers never reach the archive',async()=>{
 const h=harness();try{
  await assert.rejects(h.api.chatMemoTool('sabeq_save_chat_draft',{caseData,grounds,sourceIds:[999]},actor),e=>e.status===422);
  await assert.rejects(h.api.chatMemoTool('sabeq_save_chat_draft',{caseData,grounds:grounds+' وتنص المادة 99 من القانون رقم 98765 لسنة 2000 【م1】.',sourceIds:[101]},actor),e=>e.status===422);
  assert.equal(h.sql('SELECT COUNT(*) n FROM management_memo_requests')[0].n,0);
 }finally{h.cleanup();}
});

test('a source-valid but materially weak owner repair is rejected before it can become a saved memorandum',async()=>{
 const h=harness();try{
  const id='synthetic-weak-repair';
  h.sql("INSERT INTO management_memo_requests(id,client_name,email,case_type,case_number,input_json,output_text,status,error_code,origin) VALUES(?,?,?,?,?,?,'','failed','generation_failed','website')",[id,caseData.clientName,'client@example.test',caseData.caseType,caseData.caseNumber,JSON.stringify(caseData)]);
  const before=await h.api.chatMemoTool('sabeq_read_memo_request',{requestId:id},actor);
  const weak='1- دفع مختصر: منازعة عامة في المطالبة دون تطبيق مفصل على الوقائع، ودون عرض اعتراض مستقل أو رد مسبب يبين أثره في الطلب. 【م1】';
  await assert.rejects(h.api.chatMemoTool('sabeq_save_chat_draft',{caseData:{...caseData,repairExistingRequestId:id,repairExpectedHash:before.repair.expectedHash,repairReason:'اختبار منع حفظ مسودة ضعيفة رغم وجود مرجع مصدر اصطناعي.'},grounds:weak,sourceIds:[101]},actor),e=>e.status===422&&/أقصر أو أضعف/.test(e.message));
  const row=h.sql('SELECT output_text,status FROM management_memo_requests WHERE id=?',[id])[0];assert.equal(row.output_text,'');assert.equal(row.status,'failed');
 }finally{h.cleanup();}
});

test('empty repair separates explicit research instructions while preserving raw requested relief and source gates',async()=>{
 const h=harness();try{
  const id='synthetic-research-tail';
  const relief='رفض المطالبة الإضافية مع إبقاء حدود هذا الطلب كما هي.';
  const instruction='وكذلك طلب إدخال نصوص قانونية ملائمة تقوي الموقف بموجب [المادة ذات الصلة]。【م99】';
  const original={...caseData,requests:relief+' '+instruction};
  h.sql("INSERT INTO management_memo_requests(id,client_name,email,case_type,case_number,input_json,output_text,status,error_code,origin) VALUES(?,?,?,?,?,?,'','failed','generation_failed','website')",[id,original.clientName,'client@example.test',original.caseType,original.caseNumber,JSON.stringify(original)]);
  const before=await h.api.chatMemoTool('sabeq_read_memo_request',{requestId:id},actor);
  const args={caseData:{...original,repairExistingRequestId:id,repairExpectedHash:before.repair.expectedHash,repairReason:'فصل تعليمات بحث اصطناعية عن الطلب القضائي دون تعديل المدخل الأصلي.'},grounds,sourceIds:[101]};
  await assert.rejects(h.api.chatMemoTool('sabeq_save_chat_draft',{...args,grounds:grounds+' المادة 9999 من القانون رقم 98765 لسنة 2000 【م1】.'},actor),e=>e.status===422);
  const result=await h.api.chatMemoTool('sabeq_save_chat_draft',args,actor);
  const after=await h.api.chatMemoTool('sabeq_read_memo_request',{requestId:id},actor);
  assert.equal(after.caseData.requests,original.requests);assert.equal(after.caseData.facts,original.facts);assert.equal(after.caseData.ownerDraftingInstructions,instruction);
  assert.ok(after.draft.includes(relief));assert.doesNotMatch(after.draft,/وكذلك طلب إدخال نصوص|ذات الصلة|م99/);assert.equal(result.draftingInstructionsSeparated,true);assert.equal(after.reviewCode,'owner_request_repaired');assert.equal(after.contactEmailPresent,true);
 }finally{h.cleanup();}
});
test('owner-requested contact cleanup preserves the exact memo and only clears the selected chat request',async()=>{
 const h=harness();try{
  const first=await h.api.chatMemoTool('sabeq_save_chat_draft',{caseData,grounds,sourceIds:[101]},actor);
  const second=await h.api.chatMemoTool('sabeq_save_chat_draft',{caseData,grounds,sourceIds:[101]},actor);
  h.sql('UPDATE management_memo_requests SET email = ? WHERE id = ?',[actor.email,first.requestId]);
  h.sql('UPDATE management_memo_requests SET email = ?, origin = ? WHERE id = ?',['client@example.test','website',second.requestId]);
  const before=h.sql('SELECT * FROM management_memo_requests WHERE id = ?',[first.requestId])[0];
  const result=await h.api.chatMemoTool('sabeq_remove_memo_email',{requestId:first.requestId},actor);
  const after=h.sql('SELECT * FROM management_memo_requests WHERE id = ?',[first.requestId])[0];
  assert.equal(result.emailRemoved,true);assert.equal(after.email,'');assert.deepEqual({...after,email:before.email},before);
  const readable=await h.api.chatMemoTool('sabeq_read_memo_request',{requestId:first.requestId},actor);assert.equal(readable.contactEmailPresent,false);assert.equal(readable.bridgeRevision,'owner-chat-memo-3');
  await h.api.chatMemoTool('sabeq_remove_memo_email',{requestId:first.requestId},actor);
  await assert.rejects(h.api.chatMemoTool('sabeq_remove_memo_email',{requestId:second.requestId},actor),e=>e.status===409);
  await assert.rejects(h.api.chatMemoTool('sabeq_remove_memo_email',{requestId:'unknown-request'},actor),e=>e.status===404);
  assert.equal(h.sql('SELECT email FROM management_memo_requests WHERE id = ?',[second.requestId])[0].email,'client@example.test');
 }finally{h.cleanup();}
});

test('a selected chat revision preserves its case, sources and record while rejecting another case',async()=>{
 const h=harness();try{
  const first=await h.api.chatMemoTool('sabeq_save_chat_draft',{caseData,grounds,sourceIds:[101]},actor);
  const before=h.sql('SELECT * FROM management_memo_requests WHERE id=?',[first.requestId])[0];
  const result=await h.api.chatMemoTool('sabeq_save_chat_draft',{requestId:first.requestId,caseData,grounds:grounds+' صياغة أوضح مع بقاء الطلبات كما هي.',sourceIds:[101]},actor);
  assert.equal(result.requestId,first.requestId);assert.equal(result.revision,1);assert.equal(h.sql('SELECT COUNT(*) n FROM management_memo_requests')[0].n,1);assert.equal(h.revisionCalls.length,1);assert.equal(h.revisionCalls[0].expectedHash,'a'.repeat(64));
  const after=h.sql('SELECT * FROM management_memo_requests WHERE id=?',[first.requestId])[0];assert.equal(after.input_json,before.input_json);assert.equal(after.email,'');assert.equal(after.error_code,'manual_revision');
  h.sql('UPDATE management_memo_requests SET email=? WHERE id=?',[actor.email,first.requestId]);
  const compatible=await h.api.chatMemoTool('sabeq_save_chat_draft',{caseData:{...caseData,existingRequestId:first.requestId},grounds:grounds+' صياغة متوافقة.',sourceIds:[101]},actor);
  assert.equal(compatible.requestId,first.requestId);assert.equal(h.sql('SELECT email FROM management_memo_requests WHERE id=?',[first.requestId])[0].email,'');
  await assert.rejects(h.api.chatMemoTool('sabeq_save_chat_draft',{requestId:first.requestId,caseData:{...caseData,existingRequestId:'different-id'},grounds,sourceIds:[101]},actor),e=>e.status===400);

  await assert.rejects(h.api.chatMemoTool('sabeq_save_chat_draft',{requestId:first.requestId,caseData:{...caseData,requests:'طلب آخر مختلف لا يخص المذكرة'},grounds,sourceIds:[101]},actor),e=>e.status===409);
  await assert.rejects(h.api.chatMemoTool('sabeq_save_chat_draft',{requestId:first.requestId,caseData,grounds,sourceIds:[]},actor),e=>e.status===409);
 }finally{h.cleanup();}
});

test('explicit owner repair saves into the selected empty website request rather than creating another draft',async()=>{
 const h=harness();try{
  const id='synthetic-failed-website',oldInput={...caseData,originalDefendant:'طرف اصطناعي من قضية أخرى',judgmentOperative:'منطوق اصطناعي دخيل'};
  h.sql("INSERT INTO management_memo_requests(id,user_id,client_name,email,case_type,case_number,input_json,output_text,status,error_code,origin) VALUES(?,?,?,?,?,?,?,'','failed','generation_failed','website')",[id,'synthetic-client',caseData.clientName,'client@example.test',caseData.caseType,caseData.caseNumber,JSON.stringify(oldInput)]);
  const row=h.sql('SELECT * FROM management_memo_requests WHERE id=?',[id])[0];
  const hash=createHash('sha256').update(JSON.stringify([row.id,row.input_json,row.output_text,row.status,row.error_code,row.updated_at])).digest('hex');
  const repairCase={...caseData,repairExistingRequestId:id,repairExpectedHash:hash,repairReason:'إزالة حقول اصطناعية دخيلة بعد مقارنة المدخلات الأصلية لهذه القضية.'};
  await assert.rejects(h.api.chatMemoTool('sabeq_save_chat_draft',{caseData:repairCase,grounds,sourceIds:[999]},actor),e=>e.status===422);
  await assert.rejects(h.api.chatMemoTool('sabeq_save_chat_draft',{caseData:repairCase,grounds:grounds+' وتنص المادة 99 من القانون رقم 98765 لسنة 2000 【م1】.',sourceIds:[101]},actor),e=>e.status===422);
  assert.equal(h.sql('SELECT output_text FROM management_memo_requests WHERE id=?',[id])[0].output_text,'');
  const result=await h.api.chatMemoTool('sabeq_save_chat_draft',{caseData:{...caseData,repairExistingRequestId:id,repairExpectedHash:hash,repairReason:'إزالة حقول اصطناعية دخيلة بعد مقارنة المدخلات الأصلية لهذه القضية.'},grounds,sourceIds:[101]},actor);
  assert.equal(result.requestId,id);assert.equal(h.sql('SELECT COUNT(*) n FROM management_memo_requests')[0].n,1);
  const after=h.sql('SELECT * FROM management_memo_requests WHERE id=?',[id])[0];assert.equal(after.origin,'website');assert.equal(after.email,'client@example.test');assert.equal(after.user_id,'synthetic-client');assert.equal(after.status,'needs_review');assert.ok(after.output_text.includes(source.text));
 }finally{h.cleanup();}
});

test('Meta review stores a private candidate and provenance without replacing text or case identity',async()=>{const options={},h=harness(options);try{
 const saved=await h.api.chatMemoTool('sabeq_save_chat_draft',{caseData,grounds,sourceIds:[101]},actor);
 const before=h.sql('SELECT * FROM management_memo_requests WHERE id=?',[saved.requestId])[0];
 const opened=await h.api.chatMemoTool('sabeq_read_memo_request',{requestId:saved.requestId},actor);
 const result=await h.api.chatMemoTool('sabeq_review_meta_draft',{requestId:saved.requestId,expectedHash:opened.snapshotHash},actor);
 const after=h.sql('SELECT * FROM management_memo_requests WHERE id=?',[saved.requestId])[0];
 assert.equal(options.called,1);assert.equal(result.canonicalMemoUnchanged,true);assert.equal(after.output_text,before.output_text);assert.equal(after.email,before.email);assert.equal(after.status,'needs_review');assert.equal(JSON.parse(after.input_json).facts,caseData.facts);assert.equal(JSON.parse(after.input_json).ownerMetaReview.status,'candidate_requires_human_review');
 await assert.rejects(h.api.chatMemoTool('sabeq_review_meta_draft',{requestId:saved.requestId,expectedHash:opened.snapshotHash},actor),e=>e.status===409);
}finally{h.cleanup();}});
test('Meta review rejects paid models, failed transport, factual changes, false citations and concurrent edits',async()=>{
 for(const options of [{model:'meta-llama/llama-test'},{fail:true},{changeFacts:true},{invalidCitation:true},{onReview:h=>h.sql("UPDATE management_memo_requests SET output_text='concurrent synthetic change'")}]){
 const h=harness(options);try{
 const saved=await h.api.chatMemoTool('sabeq_save_chat_draft',{caseData,grounds,sourceIds:[101]},actor);
 const opened=await h.api.chatMemoTool('sabeq_read_memo_request',{requestId:saved.requestId},actor);
 await assert.rejects(h.api.chatMemoTool('sabeq_review_meta_draft',{requestId:saved.requestId,expectedHash:opened.snapshotHash},actor));
 const after=h.sql('SELECT * FROM management_memo_requests WHERE id=?',[saved.requestId])[0];
 assert.equal(JSON.parse(after.input_json).ownerMetaReview,undefined);
 if(options.model)assert.equal(options.called,undefined);
 if(options.onReview)assert.equal(after.output_text,'concurrent synthetic change');else assert.equal(after.output_text,saved.memo);
 }finally{h.cleanup();}}
});

test('an already approved paid Meta model needs no new model or billing settings',async()=>{const options={model:'meta-llama/llama-test',allowPaid:true},h=harness(options);try{const saved=await h.api.chatMemoTool('sabeq_save_chat_draft',{caseData,grounds,sourceIds:[101]},actor);const opened=await h.api.chatMemoTool('sabeq_read_memo_request',{requestId:saved.requestId},actor);const result=await h.api.chatMemoTool('sabeq_review_meta_draft',{requestId:saved.requestId,expectedHash:opened.snapshotHash},actor);assert.equal(options.called,1);assert.equal(result.metaReview.model,options.model);}finally{h.cleanup();}});
