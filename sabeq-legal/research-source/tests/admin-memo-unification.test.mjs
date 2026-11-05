import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';

const root=new URL('../',import.meta.url);
function setup() {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('tests/fixtures/management-source-tables.sql',root),'utf8'));
  sqlite.exec(readFileSync(new URL('drizzle/0005_icy_dark_phoenix.sql',root),'utf8'));
  sqlite.exec("CREATE TABLE service_settings (service_key TEXT, enabled INTEGER, payment_required INTEGER, price_fils INTEGER, currency TEXT, updated_at TEXT)");
  const db={prepare(sql){let args=[];return{bind(...values){args=values;return this;},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)}}};}};
  let allowed=true;
  const dependencies={
    '@/db': {getD1:()=>db},
    '@/lib/admin-service-auth': {
      requireAdminService:async()=>allowed?null:Response.json({error:'forbidden'},{status:403}),
      adminJson:value=>Response.json(value),
    },
  };
  const load=path=>{
    const result={};
    const transpiled=ts.transpileModule(readFileSync(new URL(path,root),'utf8'),{
      compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
    }).outputText;
    vm.runInNewContext(transpiled,{exports:result,require(name){if(!(name in dependencies)) throw Error('Unexpected dep: '+name);return dependencies[name]},URL,Response,console});
    return result;
  };
  const addUser=(id,name)=>sqlite.prepare("INSERT INTO public_users (id,name,phone,email,email_verified_at) VALUES (?,?,?,?,?)").run(id,name,'000','test@example.invalid','2026-01-01');
  const addMemo=(id,user_id,name,status='needs_review')=>sqlite.prepare(
    "INSERT INTO management_memo_requests (id,user_id,client_name,email,case_type,input_json,status,origin,output_text) VALUES (?,?,?,?,?,?,?,?,?)"
  ).run(id,user_id,name,'','مدني',JSON.stringify({facts:'وقائع اختبار آلية'}),status,'https://q8-ux.github.io','مسودة اختبار');
  return {sqlite,load,addUser,addMemo,setAllowed:value=>{allowed=value},close:()=>sqlite.close()};
}
test('admin overview counts guest and registered memo requests plus unmirrored archive once', async()=>{
  const h=setup();try{
    h.addUser('u1','مستخدم اختبار');
    h.addMemo('g1',null,'ضيف اختبار');
    h.addMemo('u-memo','u1','مستخدم اختبار');
    h.sqlite.prepare("INSERT INTO service_records (id,user_id,service_type,title,metadata_json) VALUES (?,?,?,?,?)")
      .run('mirrored','u1','memo','مرآة محاسبية',JSON.stringify({managementRequestId:'u-memo'}));
    h.sqlite.prepare("INSERT INTO service_records (id,user_id,service_type,title) VALUES (?,?,?,?)")
      .run('historical','u1','memo_archive','مذكرة قديمة');
    h.sqlite.prepare("INSERT INTO consultation_requests (name,phone,case_type) VALUES ('استشارة اختبار','000','مدني')").run();
    const data=await (await h.load('app/api/admin/dashboard/route.ts').GET(new Request('https://test.invalid/api/admin/dashboard'))).json();
    assert.equal(data.activities.memos,3);
    assert.equal(data.appointments.total,1);
    assert.equal(data.recentRecords.filter(x=>x.service_type==='memo'||x.service_type==='memo_archive').length,3);
    assert.ok(data.recentRecords.some(x=>x.id==='memo:g1'&&x.user_name==='ضيف اختبار'));
    assert.ok(!data.recentRecords.some(x=>x.id==='legacy:mirrored'));
  }finally{h.close()}
});
test('admin records returns guest, registered and archive with no double counting; filters work', async()=>{
  const h=setup();try{
    h.addUser('u1','اسم تجريبي');
    h.addMemo('g1',null,'عميل ضيف');
    h.addMemo('u-memo','u1','عميل مسجل');
    h.sqlite.prepare("INSERT INTO service_records (id,user_id,service_type,title,metadata_json) VALUES (?,?,?,?,?)")
      .run('mirrored','u1','memo','نسخة مرتبطة',JSON.stringify({managementRequestId:'u-memo'}));
    h.sqlite.prepare("INSERT INTO service_records (id,user_id,service_type,title) VALUES (?,?,?,?)")
      .run('old','u1','memo_archive','مذكرة مؤرشفة');
    h.sqlite.prepare("INSERT INTO service_records (id,user_id,service_type,title) VALUES (?,?,?,?)")
      .run('assistant','u1','assistant','سؤال قانوني');
    const get=h.load('app/api/admin/records/route.ts').GET;
    const res=await (await get(new Request('https://test.invalid/api/admin/records?type=memo&limit=100'))).json();
    assert.equal(res.records.length,3);
    assert.equal(new Set(res.records.map(x=>x.id)).size,3);
    assert.ok(res.records.some(x=>x.id==='memo:g1'&&x.input_text.includes('وقائع اختبار')));
    assert.ok(res.records.some(x=>x.id==='legacy:old'));
    const assistant=await (await get(new Request('https://test.invalid/api/admin/records?type=assistant'))).json();
    assert.deepEqual(assistant.records.map(x=>x.id),['legacy:assistant']);
  }finally{h.close()}
});
test('records and dashboard continue enforcing server-side authorization',async()=>{
  const h=setup();try{
    h.setAllowed(false);
    for (const path of ['app/api/admin/dashboard/route.ts','app/api/admin/records/route.ts']) {
      const response=await h.load(path).GET(new Request('https://test.invalid/api/admin/records'));
      assert.equal(response.status,403);
      assert.equal((await response.json()).error,'forbidden');
    }
  }finally{h.close()}
});
