import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { createApp } from '../server/app.mjs';
import { initialize } from '../server/store.mjs';
import { sha } from '../server/security.mjs';
import { amountInFils } from '../server/accounts.mjs';
import { normalizeSearch } from '../server/library.mjs';
import { attachmentPartSize } from '../server/attachments.mjs';

const setup = 'synthetic-test-owner-setup-very-long-token';
const password = 'Test synthetic password 2026';
const baseInput = {
  title: 'مسودة تجريبية للاختبار', type: 'مذكرة دفاع', court: 'المحكمة الكلية', number: 'QA-402',
  party: 'الطرف الأول، مدعى عليه', opponent: 'الطرف الثاني، مدعٍ',
  facts: 'أفاد الطرف الأول أنه تسلم مطالبة خطية.\nقدّم إيصالاً تجريبياً ضمن وقائع الاختبار.',
  grounds: 'يطلب الطرف الأول فحص بيانات الإيصال.', requests: 'التثبت من مقدار المطالبة.',
};

async function environment(t) {
  const raw = new PGlite();
  const db = {
    query: (sql, args) => raw.query(sql,args),
    transaction: callback => raw.transaction(tx => callback({
      query: (sql,args) => tx.query(sql,args), exec: (sql) => tx.exec(sql),
    })),
  };
  await initialize(db);
  const server = createServer();
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const objects = new Map();
  const storage = {
    async put(key, data) { objects.set(key, data); },
    async get(key) { return Readable.from([objects.get(key)]); },
    async remove(keys) { keys.forEach(key => objects.delete(key)); },
  };
  const model = {
    async complete({ messages, schema }) {
      const input = JSON.parse(messages[1].content);
      if (schema.properties.points) return { points: [{ text: 'The reviewed excerpt addresses the document.',
        sourceIds: Object.keys(input.references) }] };
      const argument = input.caseDetails.grounds?.join(' ').includes('إحالة مرفوضة')
        ? 'يطبق حكم وفق المادة (٩٩٩٩) وهي إحالة غير صحيحة.' : 'تراجع دلالة الإيصال على مقدار المطالبة.';
      const analyses = Object.fromEntries(input.languages.map(language => [language, [{
        issue: language === 'ar' ? 'قيمة المستند' : 'Value of the document',
        analysis: language === 'ar' ? argument : 'The document merits review.',
        application: language === 'ar' ? 'يفحص الإيصال المدخل.' : 'Examine the submitted receipt.',
        sourceIds: Object.keys(input.reviewedReferences),
      }]]));
      return { analyses, translations: { facts: ['The letter was received on 2026/11/13.'],
        requests: ['Verify the amount claimed.'] } };
    },
  };
  const ready = createApp({db, origin, setupHash: sha(setup), model, storage});
  server.on('request',ready);
  t.after(async ()=>{
    await new Promise(resolve=>server.close(resolve));
    await raw.close();
  });
  return {
    db, origin, objects,
    async call(path,{cookie,method='GET',data,binary,from=origin}={}) {
      const response = await fetch(origin + path, {
        method, headers: { ...(cookie?{cookie}:{}), Origin:from,
          ...(data !== undefined || binary ? { 'Content-Type':binary ? 'application/octet-stream' : 'application/json' } : {}) },
        body: binary || (data === undefined ? undefined : JSON.stringify(data)),
      });
      const body = response.headers.get('content-type')?.includes('application/json')
        ? await response.json() : Buffer.from(await response.arrayBuffer());
      return { status:response.status, body, cookie:response.headers.get('set-cookie')?.split(';')[0],
        cookieHeader:response.headers.get('set-cookie'), headers:response.headers };
    },
  };
}

test('Kuwaiti dinars preserve fils and Arabic search preserves digit identity',()=>{
  assert.equal(amountInFils('12.345'),12345);
  assert.equal(amountInFils('12.3'),12300);
  assert.throws(()=>amountInFils('12.3456'));
  assert.equal(normalizeSearch('الإثْبـات ٣٩ / ۱۹۸۰'),'الاثبات 39 1980');
});

test('owner setup, independent client access and monthly renewals',async t=>{
  const {db,call,origin} = await environment(t);
  const post=(path,data,cookie)=>call(path,{method:'POST',data,cookie});
  const patch=(path,data,cookie)=>call(path,{method:'PATCH',data,cookie});
  const health=await call('/healthz');
  assert.equal(health.body.app,'tahkeem');
  assert.equal((await call('/api/overview')).status,401);
  assert.equal((await call('/api/session')).body.setupAvailable,true);
  assert.equal((await call('/api/setup',{method:'POST',data:{},from:'https://other.test'})).status,403);
  const owner=await post('/api/setup',{code:setup,name:'مالك الاختبار',email:'owner@example.test',password});
  assert.equal(owner.status,200,JSON.stringify(owner.body));
  assert.match(owner.cookieHeader,/HttpOnly/);
  assert.match(owner.cookieHeader,/SameSite=Strict/);
  assert.equal((await post('/api/setup',{code:setup,name:'مالك آخر',email:'other@example.test',password})).status,409);
  assert.equal((await call('/api/session')).body.setupAvailable,false);

  async function addClient(index) {
    const created=await post('/api/owner/clients',{name:`عميل الاختبار ${index}`,email:`client${index}@example.test`},owner.cookie);
    assert.equal(created.status,201,JSON.stringify(created.body));
    assert.ok(created.body.invite.startsWith(origin+'/#invite='));
    const code=created.body.invite.split('=')[1];
    const activated=await post('/api/invite',{code,password});
    assert.equal(activated.status,200);
    assert.equal(activated.body.account.active,false);
    assert.equal((await post('/api/invite',{code,password})).status,400);
    return {id:created.body.account.id,cookie:activated.cookie,email:created.body.account.email};
  }
  const a=await addClient(1);
  const b=await addClient(2);
  assert.equal((await call('/api/memos',{cookie:a.cookie})).status,403);
  assert.equal((await call('/api/subscription',{cookie:a.cookie})).status,200);
  assert.equal((await call('/api/owner/clients',{cookie:a.cookie})).status,403);

  const monthly={months:1,amount:'20.125',reference:'QA-REC-1',received:true};
  const [first,retried]=await Promise.all([post(`/api/owner/clients/${a.id}/renewals`,monthly,owner.cookie),
    post(`/api/owner/clients/${a.id}/renewals`,monthly,owner.cookie)]);
  assert.equal(first.status,201,JSON.stringify(first.body));
  assert.equal(retried.status,201);
  assert.equal(first.body.renewal.id,retried.body.renewal.id);
  assert.equal(first.body.renewal.amount_fils,20125);
  assert.equal((await post(`/api/owner/clients/${b.id}/renewals`,monthly,owner.cookie)).status,409);
  const renewed=await post(`/api/owner/clients/${b.id}/renewals`,{...monthly,reference:'QA-REC-2'},owner.cookie);
  assert.equal(renewed.status,201);
  assert.equal((await call('/api/subscription',{cookie:a.cookie})).body.records.length,1);
  assert.equal((await call('/api/subscription',{cookie:owner.cookie})).body.records.length,2);
  assert.equal((await call('/api/owner/clients',{cookie:a.cookie})).status,403);

  const ids = {id:randomUUID(),sourceIds:['evidence-39-1']};
  const created=await post('/api/memos',{...baseInput,...ids},a.cookie);
  assert.equal(created.status,201,JSON.stringify(created.body));
  assert.equal(created.body.status,'review');
  assert.equal(created.body.sources[0].citable,false);
  assert.doesNotMatch(created.body.body,/المادة 1 من قانون الإثبات/);
  assert.equal((await post('/api/memos',{...baseInput,...ids},a.cookie)).body.id,created.body.id);
  assert.equal((await call('/api/overview',{cookie:b.cookie})).body.counts.open,0);
  assert.equal((await call('/api/memos',{cookie:a.cookie})).body.total,1);

  const memoPath=`/api/memos/${created.body.id}`;
  assert.equal((await call(memoPath,{cookie:b.cookie})).status,404);
  assert.equal((await call(memoPath+'/word',{cookie:owner.cookie})).status,404);
  assert.equal((await patch(memoPath,{version:1,status:'approved'},a.cookie)).status,422);
  const approved=await patch(memoPath,{version:1,status:'approved',reviewed:true},a.cookie);
  assert.equal(approved.status,200);
  assert.equal((await patch(memoPath,{version:1,title:'عنوان لم يحفظ'},a.cookie)).status,409);
  const word=await call(memoPath+'/word',{cookie:a.cookie});
  assert.equal(word.body.subarray(0,2).toString(),'PK');
  assert.match(word.headers.get('content-disposition'),/filename\*=UTF-8/);
  assert.equal((await patch(memoPath,{version:approved.body.version,status:'archived'},a.cookie)).body.status,'archived');

  await db.query("UPDATE accounts SET access_until=now()-interval '1 minute' WHERE id=$1",[a.id]);
  assert.equal((await call(memoPath,{cookie:a.cookie})).status,403);
  const renewal=await post(`/api/owner/clients/${a.id}/renewals`,{...monthly,reference:'QA-REC-3'},owner.cookie);
  assert.equal(renewal.body.account.active,true);
  assert.equal((await call(memoPath,{cookie:a.cookie})).status,200);
  assert.equal((await patch(`/api/owner/clients/${a.id}`,{enabled:false},owner.cookie)).status,200);
  assert.equal((await call(memoPath,{cookie:a.cookie})).status,401);
  assert.equal((await post('/api/login',{email:a.email,password})).status,401);
  assert.equal((await patch(`/api/owner/clients/${a.id}`,{enabled:true},owner.cookie)).status,200);
  assert.equal((await post('/api/login',{email:a.email,password})).status,200);
});

test('reference approval and guard against generated citations',async t=>{
  const {call}=await environment(t);
  const post=(path,data,cookie)=>call(path,{method:'POST',data,cookie});
  const owner=await post('/api/setup',{code:setup,name:'مالك الاختبار',email:'owner@example.test',password});
  const source=await call('/api/library?kind=article&q='+encodeURIComponent('الإثبات ٣٩'),{cookie:owner.cookie});
  assert.equal(source.status,200);
  assert.equal(source.body.items.length,3);
  assert.ok(source.body.items.every(item=>item.kind==='article' && !item.citable));
  const ref={kind:'article',category:'اختبار اصطناعي',title:'مرجع اصطناعي للبرمجيات',
    authority:'اختبار فقط',identity:'المادة الاصطناعية رقم 9001',edition:'عينة اختبار',locator:'ص 1',
    summary:'محتوى اصطناعي لا يمثل مرجعاً قانونياً حقيقياً.',sourceUrl:'https://moj.gov.kw/',citable:true};
  assert.equal((await post('/api/owner/references',ref,owner.cookie)).status,400);
  assert.equal((await post('/api/owner/references',{...ref,checked:true,sourceUrl:'https://example.test'},owner.cookie)).status,400);
  const reference=await post('/api/owner/references',{...ref,checked:true},owner.cookie);
  assert.equal(reference.status,201,JSON.stringify(reference.body));
  const caseInput={...baseInput,method:'model',sourceIds:[reference.body.id],id:randomUUID()};
  assert.equal((await post('/api/memos',caseInput,owner.cookie)).status,400);
  const good=await post('/api/memos',{...caseInput,allowModel:true},owner.cookie);
  assert.equal(good.status,201,JSON.stringify(good.body));
  assert.match(good.body.body,/المادة الاصطناعية رقم 9001/);
  assert.match(good.body.body,/تراجع دلالة الإيصال/);
  assert.equal(good.body.status,'review');
  const bad=await post('/api/memos',{...caseInput,id:randomUUID(),grounds:'إحالة مرفوضة',allowModel:true},owner.cookie);
  assert.equal(bad.status,422);
  assert.equal((await call('/api/overview',{cookie:owner.cookie})).body.counts.open,1);
  const chat=await post('/api/arbitrator',{question:'مرجع اصطناعي للبرمجيات',language:'en',allowModel:true},owner.cookie);
  assert.equal(chat.status,200);
  assert.equal(chat.body.mode,'model');
  assert.equal(chat.body.points[0].sourceIds[0],reference.body.id);
});

test('imported material keeps article suffix, page and review status', async t => {
  const {db,call}=await environment(t);
  const src=sha('synthetic corpus fingerprint');
  const corpusId='test-corpus-article-2';
  const setupResult=await call('/api/setup',{method:'POST',data:{code:setup,name:'مالك الاختبار',
    email:'owner@example.test',password}});
  const cookie=setupResult.cookie;
  async function insert(id,number,searchable) {
    await db.query(`INSERT INTO corpus_articles
      (id,document_id,component_id,article_number,number_key,document_title,heading,start_page,end_page,printed_page,
        text,text_sha256,source_sha256,boundary_review,text_verified,searchable)
      VALUES ($1,'test-law','law-text',$2,$3,'تشريع افتراضي','عنوان اختباري',12,13,'9',$4,$5,$6,
        'inferred_from_source_markers',false,$7)`,[id,number,normalizeSearch(number),
        'متن اصطناعي للفهرس',sha('متن اصطناعي للفهرس'),src,normalizeSearch(searchable)]);
  }
  await insert(corpusId,'٢','تشريع افتراضي عنوان اختباري 2');
  await insert(corpusId+'-repeated','٢ مكرر','تشريع افتراضي عنوان اختباري 2 مكرر');
  const detail='/api/corpus/'+corpusId;
  assert.equal((await call(detail,{cookie})).status,404);
  await db.query('INSERT INTO corpus_imports(source_sha256,article_count,page_count,section_count) VALUES($1,2,25,1)',[src]);
  const query=await call('/api/library?kind=article&q='+encodeURIComponent('المادة ٢ تشريع افتراضي'),{cookie});
  assert.equal(query.body.total,1);
  assert.equal(query.body.items[0].id,corpusId);
  const repeated=await call('/api/library?kind=article&q='+encodeURIComponent('٢ مكرر'),{cookie});
  assert.equal(repeated.body.total,1);
  assert.equal(repeated.body.items[0].id,corpusId+'-repeated');
  const source=await call(detail,{cookie});
  assert.equal(source.status,200);
  assert.equal(source.body.source.pageEnd,13);
  assert.equal(source.body.source.currentLawVerified,false);
  assert.equal(source.body.body,'متن اصطناعي للفهرس');
  assert.equal((await call(detail)).status,401);
  const memo=await call('/api/memos',{method:'POST',cookie,data:{...baseInput,id:randomUUID(),sourceIds:[corpusId]}});
  assert.equal(memo.status,201,JSON.stringify(memo.body));
  assert.equal(memo.body.sources[0].origin,'corpus');
  assert.doesNotMatch(memo.body.body,/المادة ٢/);
  const bot=(question,language,cookie)=>call('/api/arbitrator',{method:'POST',cookie,data:{question,language}});
  assert.equal((await bot('المادة ٢ مكرر من تشريع افتراضي','ar')).status,401);
  const answer=await bot('Article 2 from legislation','en',cookie);
  assert.equal(answer.status,200,JSON.stringify(answer.body));
  assert.equal(answer.body.mode,'library');
  assert.ok(answer.body.sources.some(item=>item.id===corpusId && !item.citable && item.excerpt));
  assert.ok(answer.body.sources.every(item=>item.id!==corpusId+'-repeated'));
  assert.equal((await bot('كيف أكتب مذكرة دفاع؟','ar',cookie)).body.mode,'guide');
});

test('bilingual memoranda preserve submissions and check both versions before approval', async t => {
  const {call}=await environment(t);
  const post=(path,data,cookie)=>call(path,{method:'POST',data,cookie});
  const owner=await post('/api/setup',{code:setup,name:'مالك الاختبار',email:'owner@example.test',password});
  const data={...baseInput,language:'both',evidence:'صورة خطاب تجريبي',opponentGrounds:'ينازع الخصم في الاستلام.',
    reply:'يتمسك مقدم المذكرة بإيصال التسلم.',alternativeRequests:'إعادة الفحص احتياطيًا.'};
  assert.equal((await post('/api/memos',data,owner.cookie)).status,422);
  const english={title:'Synthetic bilingual memorandum',party:'First party, defendant',opponent:'Second party, claimant',
    facts:'A written demand was received.\nA synthetic receipt was produced.',evidence:'Copy of a sample letter.',
    grounds:'Examine the receipt.',opponentGrounds:'Receipt is disputed.',reply:'The filing party relies on the receipt.',
    requests:'Verify the amount claimed.',alternativeRequests:'Order review in the alternative.'};
  const result=await post('/api/memos',{...data,english},owner.cookie);
  assert.equal(result.status,201,JSON.stringify(result.body));
  assert.match(result.body.body,/دفوع الخصم والرد عليها/);
  assert.match(result.body.body,/الطلبات الاحتياطية\n1\. إعادة الفحص/);
  assert.match(result.body.alternate_body,/Court of First Instance/);
  assert.match(result.body.alternate_body,/Opposing submissions and reply/);
  assert.match(result.body.alternate_body,/Alternative relief\n1\. Order review/);
  const memo='/api/memos/'+result.body.id;
  const patch=(data)=>call(memo,{method:'PATCH',cookie:owner.cookie,data:{version:1,...data}});
  const unsafe=await patch({alternateBody:result.body.alternate_body+'\nUnder Article 9999.',status:'approved',reviewed:true});
  assert.equal(unsafe.status,422);
  assert.equal((await patch({status:'approved',reviewed:true})).status,200);
  const englishOnly=await post('/api/memos',{...baseInput,...english,language:'en'},owner.cookie);
  assert.equal(englishOnly.status,201,JSON.stringify(englishOnly.body));
  assert.equal(englishOnly.body.alternate_body,null);
  assert.match(englishOnly.body.body,/^Court of First Instance/);
  const model=await post('/api/memos',{...baseInput,language:'both',method:'model',allowModel:true,grounds:'',
    facts:'تم تسلم الخطاب التجريبي في 2026/11/13.',requests:'التحقق من قيمة المطالبة.'},owner.cookie);
  assert.equal(model.status,201,JSON.stringify(model.body));
  assert.match(model.body.body,/2026\/11\/13/);
  assert.match(model.body.alternate_body,/The letter was received on 2026\/11\/13/);
});

test('attachments stream multiple parts, handle retries and respect account boundaries', async t => {
  const {call,objects,db}=await environment(t);
  const post=(path,data,cookie)=>call(path,{method:'POST',data,cookie});
  const owner=await post('/api/setup',{code:setup,name:'مالك الاختبار',email:'owner@example.test',password});
  const created=await post('/api/owner/clients',{name:'عميل الاختبار',email:'client@example.test'},owner.cookie);
  const client=await post('/api/invite',{code:created.body.invite.split('=')[1],password});
  await db.query("UPDATE accounts SET access_until=now()+interval '1 month' WHERE id=$1",[client.body.account.id]);
  const id=randomUUID();
  const memoId=randomUUID();
  const first=Buffer.alloc(attachmentPartSize, 0x6d);
  const last=Buffer.from([0x61,0x62,0xff]);
  const metadata={id,memoId,name:'مستند تجريبي.bin',bytes:first.length+last.length,fingerprint:sha('synthetic attachment')};
  assert.equal((await post('/api/attachments',metadata,client.cookie)).status,201);
  const part=(index,binary,cookie=client.cookie)=>call(`/api/attachments/${id}/parts/${index}`,{method:'PUT',binary,cookie});
  assert.equal((await part(1,last)).status,409);
  assert.equal((await part(0,first,owner.cookie)).status,404);
  assert.equal((await part(0,first)).body.uploadedParts,1);
  assert.equal((await post('/api/attachments',{...metadata,fingerprint:sha('different attachment')},client.cookie)).status,409);
  assert.equal((await post('/api/attachments',metadata,client.cookie)).body.uploadedParts,1);
  assert.equal((await part(0,first)).body.uploadedParts,1);
  assert.equal((await part(1,last)).body.status,'ready');
  const download=`/api/attachments/${id}/download`;
  assert.equal((await call(download)).status,401);
  assert.equal((await call(download,{cookie:owner.cookie})).status,404);
  const file=await call(download,{cookie:client.cookie});
  assert.equal(file.status,200);
  assert.equal(file.headers.get('content-length'),String(metadata.bytes));
  assert.deepEqual(file.body,Buffer.concat([first,last]));
  const memo=await post('/api/memos',{...baseInput,id:memoId},client.cookie);
  assert.equal(memo.status,201);
  assert.equal((await call('/api/memos/'+memoId,{cookie:client.cookie})).body.attachments[0].id,id);
  assert.equal((await call(`/api/attachments/${id}`,{method:'DELETE',cookie:client.cookie})).status,204);
  assert.equal(objects.size,0);
});
