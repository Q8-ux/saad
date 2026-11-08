import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { load } from './template-harness.mjs';

function harness() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('./fixtures/management-source-tables.sql', import.meta.url), 'utf8'));
  sql.exec(readFileSync(new URL('../drizzle/0005_icy_dark_phoenix.sql', import.meta.url), 'utf8'));
  sql.exec(readFileSync(new URL('../drizzle/0006_sadad_payments.sql', import.meta.url), 'utf8'));
  sql.prepare("INSERT INTO public_users (id,name,phone,email,email_verified_at) VALUES ('synthetic-user','Synthetic','000','synthetic@example.test','2026-01-01')").run();
  const db = { prepare(query) { let values=[]; return { bind(...args){values=args;return this;}, async run(){return {success:true,meta:sql.prepare(query).run(...values)};}, async first(){return sql.prepare(query).get(...values)||null;}, async all(){return {results:sql.prepare(query).all(...values)};} }; }, async batch(statements){sql.exec('BEGIN');try{const rows=[];for(const s of statements)rows.push(await s.run());sql.exec('COMMIT');return rows;}catch(e){sql.exec('ROLLBACK');throw e;}} };
  const ledger=load('../lib/memo-requests.ts', {'@/db':{getD1:()=>db}});
  const data=load('../lib/management-data.ts', {'@/db':{getD1:()=>db},'@/lib/management-auth':{},'@/lib/management-integrations':{SERVICE_ORIGIN:'https://test.invalid'},'@/lib/request-security':{RequestError:class extends Error{constructor(message,status){super(message);this.status=status;}}}});
  return {sql,db,ledger,data};
}
test('a later failure cannot erase the already persisted original or its ready status', async()=>{
  const h=harness();try{const id=await h.ledger.startMemoRequest({clientName:'Synthetic'},null,'https://test.invalid');
  await h.ledger.finishMemoRequest(id,'needs_review','Synthetic saved memo');
  await h.ledger.finishMemoRequest(id,'failed','','post_save_failure');
  const row=h.sql.prepare('SELECT * FROM management_memo_requests WHERE id=?').get(id);
  assert.equal(row.output_text,'Synthetic saved memo');assert.equal(row.status,'needs_review');
  }finally{h.sql.close();}
});
test('an empty output cannot claim readiness', async()=>{
  const h=harness();try{const id=await h.ledger.startMemoRequest({},null,'https://test.invalid');
  await assert.rejects(h.ledger.finishMemoRequest(id,'needs_review',' \n '));
  assert.equal(h.sql.prepare('SELECT status FROM management_memo_requests WHERE id=?').get(id).status,'running');
  }finally{h.sql.close();}
});
test('completion retries update one request and one archive with the same original',async()=>{
 const h=harness();try{
 const id=await h.ledger.startMemoRequest({}, {id:'synthetic-user',email:'test@example.test'},'https://test.invalid');
 const history={userId:'synthetic-user',title:'Synthetic',inputText:'Synthetic input',metadata:{}};
 await h.ledger.completeMemoRequest(id,'Synthetic saved memo',history);
 await h.ledger.completeMemoRequest(id,'Synthetic saved memo',history);
 assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM service_records').get().n,1);
 assert.equal(h.sql.prepare('SELECT output_text FROM management_memo_requests WHERE id=?').get(id).output_text,'Synthetic saved memo');
 }finally{h.sql.close();}
});
test('a failed archive insert rolls back readiness and output together',async()=>{
 const h=harness();try{
 const id=await h.ledger.startMemoRequest({}, {id:'synthetic-user',email:'test@example.test'},'https://test.invalid');
 h.sql.exec("CREATE TRIGGER reject_archive BEFORE INSERT ON service_records BEGIN SELECT RAISE(ABORT,'synthetic failure'); END");
 await assert.rejects(h.ledger.completeMemoRequest(id,'Synthetic generated memo',{userId:'synthetic-user',title:'Test',inputText:'',metadata:{}}));
 const row=h.sql.prepare('SELECT status,output_text FROM management_memo_requests WHERE id=?').get(id);
 assert.equal(row.status,'running');assert.equal(row.output_text,'');
 assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM service_records').get().n,0);
 }finally{h.sql.close();}
});
test('updating a nonexistent request cannot confirm persistence',async()=>{
 const h=harness();try{await assert.rejects(h.ledger.completeMemoRequest('synthetic-missing-id','Synthetic output'));}finally{h.sql.close();}
});
test('recovery follows the exact request metadata and returns text rather than a JSON object',async()=>{
 const h=harness();try{
 const id=await h.ledger.startMemoRequest({},null,'https://test.invalid');
 h.sql.prepare("INSERT INTO service_records (id,user_id,service_type,output_text,metadata_json) VALUES (?,?,?,?,?)").run('synthetic-archive','synthetic-user','memo',JSON.stringify({result:{memo:'Synthetic original'}}),JSON.stringify({managementRequestId:id}));
 h.sql.prepare("INSERT INTO service_records (id,user_id,service_type,output_text,metadata_json) VALUES (?,?,?,?,?)").run('synthetic-decoy','synthetic-user','memo','Unrelated synthetic text',JSON.stringify({managementRequestId:'other-request'}));
 const result=await h.data.managerMemos(new URL('https://test.invalid/?id='+id));assert.equal(result.memo.output_text,'Synthetic original');assert.equal(result.memo.content_source,'service_records.output_text');
 assert.equal(h.sql.prepare('SELECT output_text FROM management_memo_requests WHERE id=?').get(id).output_text,'');
 }finally{h.sql.close();}
});
test('missing text and failing a related-source query remain distinct; unknown JSON fails closed',async()=>{
 const h=harness();try{
 const id=await h.ledger.startMemoRequest({},null,'https://test.invalid'),url=new URL('https://test.invalid/?id='+id);
 assert.equal((await h.data.managerMemos(url)).memo.output_text,'');
 h.sql.prepare('UPDATE management_memo_requests SET output_text=? WHERE id=?').run('{"unknown":"synthetic"}',id);
 await assert.rejects(h.data.managerMemos(url));
 h.sql.prepare('UPDATE management_memo_requests SET output_text=? WHERE id=?').run('',id);
 h.sql.exec('DROP TABLE sadad_payments');await assert.rejects(h.data.managerMemos(url));
 }finally{h.sql.close();}
});
test('conflicting linked originals require review instead of choosing a different version silently',async()=>{
 const h=harness();try{
 const id=await h.ledger.startMemoRequest({},null,'https://test.invalid');
 for(let i=0;i<2;i++)h.sql.prepare("INSERT INTO service_records(id,user_id,service_type,output_text,metadata_json) VALUES(?,?,?,?,?)").run('synthetic-'+i,'synthetic-user','memo','Synthetic version '+i,JSON.stringify({managementRequestId:id}));
 await assert.rejects(h.data.managerMemos(new URL('https://test.invalid/?id='+id)),e=>e.status===409);
 }finally{h.sql.close();}
});
