import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { createApp } from '../server/app.mjs';
import { initialize } from '../server/store.mjs';
import { sha } from '../server/security.mjs';
import { amountInFils } from '../server/accounts.mjs';
import { normalizeSearch } from '../server/library.mjs';

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
  const ready = createApp({db, origin, setupHash: sha(setup), model: async input =>
    input.title.includes('مرفوضة') ? 'يطبق حكم وفق المادة (٩٩٩٩) وهي إحالة غير صحيحة.' : 'تراجع دلالة الإيصال على مقدار المطالبة.'});
  server.on('request',ready);
  t.after(async ()=>{
    await new Promise(resolve=>server.close(resolve));
    await raw.close();
  });
  return {
    db, origin,
    async call(path,{cookie,method='GET',data,from=origin}={}) {
      const response = await fetch(origin + path, {
        method, headers: { ...(cookie?{cookie}:{}), ...(data===undefined?{}:{
          'Content-Type':'application/json',Origin:from,
        }) }, ...(data===undefined?{}:{body:JSON.stringify(data)}),
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
  const bad=await post('/api/memos',{...caseInput,id:randomUUID(),title:'إحالة مرفوضة',allowModel:true},owner.cookie);
  assert.equal(bad.status,422);
  assert.equal((await call('/api/overview',{cookie:owner.cookie})).body.counts.open,1);
});
