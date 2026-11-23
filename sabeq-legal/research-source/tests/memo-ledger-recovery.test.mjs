import test from 'node:test';
import assert from 'node:assert/strict';
import { emailHarness } from './fixtures/user-email-harness.mjs';

test('a late empty failure preserves the exact saved memo, state and reason', async () => {
  const h=emailHarness();
  try {
    const ledger=h.load('lib/memo-requests.ts');
    const id=await ledger.startMemoRequest({facts:'وقائع اصطناعية للاختبار فقط'},null,'https://q8-ux.github.io');
    const memo='نص اصطناعي محفوظ\n0012/2026 — لا يعاد توليده';
    await ledger.finishMemoRequest(id,'needs_review',memo,'draft_generated');
    const before={...h.sqlite.prepare('SELECT * FROM management_memo_requests WHERE id=?').get(id)};
    await ledger.finishMemoRequest(id,'failed','','generation_failed');
    const after={...h.sqlite.prepare('SELECT * FROM management_memo_requests WHERE id=?').get(id)};
    assert.deepEqual(after,before);
  } finally { h.close(); }
});

test('a late automatic result cannot overwrite an existing human revision', async () => {
  const h=emailHarness();
  try {
    const ledger=h.load('lib/memo-requests.ts');
    const id=await ledger.startMemoRequest({facts:'وقائع اصطناعية'},null,'https://q8-ux.github.io');
    h.sqlite.prepare("UPDATE management_memo_requests SET output_text=?,status='needs_review',error_code='manual_revision' WHERE id=?").run('مراجعة بشرية اصطناعية محفوظة',id);
    await ledger.finishMemoRequest(id,'needs_review','نتيجة آلية اصطناعية متأخرة','draft_generated');
    const row=h.sqlite.prepare('SELECT output_text,error_code FROM management_memo_requests WHERE id=?').get(id);
    assert.equal(row.output_text,'مراجعة بشرية اصطناعية محفوظة');
    assert.equal(row.error_code,'manual_revision');
  } finally { h.close(); }
});

test('an unsuccessful request without text still records its real review stage', async () => {
  const h=emailHarness();
  try {
    const ledger=h.load('lib/memo-requests.ts');
    const id=await ledger.startMemoRequest({facts:'وقائع اصطناعية'},null,'https://q8-ux.github.io');
    await ledger.finishMemoRequest(id,'needs_review','','source_review');
    const row=h.sqlite.prepare('SELECT status,output_text,error_code FROM management_memo_requests WHERE id=?').get(id);
    assert.equal(row.status,'needs_review');assert.equal(row.output_text,'');assert.equal(row.error_code,'source_review');
  } finally { h.close(); }
});

test('distinct memo cases retain separate inputs and outputs when completion order is reversed',async()=>{
 const h=emailHarness();try{
  const ledger=h.load('lib/memo-requests.ts');
  const cases=[{clientName:'طرف اصطناعي ألف',caseNumber:'CASE-A-001',facts:'وقائع ألف فقط A-PRIVATE-001',requests:'طلب ألف فقط'},{clientName:'طرف اصطناعي باء',caseNumber:'CASE-B-002',facts:'وقائع باء فقط B-PRIVATE-002',requests:'طلب باء فقط'}];
  const ids=await Promise.all(cases.map(input=>ledger.startMemoRequest(input,null,'https://q8-ux.github.io')));assert.notEqual(ids[0],ids[1]);
  await ledger.finishMemoRequest(ids[1],'needs_review','ناتج باء فقط B-PRIVATE-002','draft_generated');
  await ledger.finishMemoRequest(ids[0],'needs_review','ناتج ألف فقط A-PRIVATE-001','draft_generated');
  for(let i=0;i<2;i++){const row=h.sqlite.prepare('SELECT input_json,output_text,case_number FROM management_memo_requests WHERE id=?').get(ids[i]);assert.equal(row.case_number,cases[i].caseNumber);assert.deepEqual(JSON.parse(row.input_json),cases[i]);assert.ok(row.output_text.includes(i?'B-PRIVATE-002':'A-PRIVATE-001'));assert.ok(!row.output_text.includes(i?'A-PRIVATE-001':'B-PRIVATE-002'));}
  assert.equal(h.network.length,0);
 }finally{h.close();}
});
