import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './template-harness.mjs';
const {readMemoContact}=load('../lib/memo-contact.ts');
const valid={contactEmail:'reply@example.test',contactPhone:'80000000',informationConfirmed:true};
test('both reply contacts and explicit accuracy confirmation are required',()=>{
 for(const patch of [{contactEmail:''},{contactEmail:'bad-address'},{contactEmail:'reply@example.test\r\nBcc:other@example.test'},{contactPhone:''},{contactPhone:'123'},{contactPhone:'8abcdefgh'},{contactPhone:'1'.repeat(16)},{informationConfirmed:false},{informationConfirmed:'true'}])assert.equal(readMemoContact({...valid,...patch}).ok,false);
});
test('Arabic and Persian digits, ordinary phone formatting and email casing normalize without inventing contacts',()=>{
 const result=readMemoContact({...valid,contactEmail:' Reply@Example.Test ',contactPhone:'٠٠٩٦٥ ٨٠٠٠-٠٠٠٠'});
 assert.equal(result.ok,true);assert.equal(result.contact.contactEmail,'reply@example.test');assert.equal(result.contact.contactPhone,'+96580000000');
 assert.equal(readMemoContact({...valid,contactPhone:'+۹۶۵ (۸۰۰۰) ۰۰۰۰'}).contact.contactPhone,'+96580000000');
 assert.equal(readMemoContact({email:valid.contactEmail,phone:valid.contactPhone,informationConfirmed:true}).ok,false);
});
test('reply metadata is saved privately without replacing account identity or entering a generated body',async()=>{
 let values;const api=load('../lib/memo-requests.ts',{'@/db':{getD1:()=>({prepare:()=>({bind(...args){values=args;return this;},run:async()=>({})})})},'@/lib/gmail':{sendSavedDraft:async()=>assert.fail('unexpected mail')},'@/lib/notification-email':{notifyMemoEvent:async()=>{}}});
 await api.startMemoRequest({...valid,clientName:'طرف اصطناعي',facts:'عينة اصطناعية للبيانات'}, {id:'synthetic-user',email:'account@example.test'},'https://example.test');
 assert.equal(values[1],'synthetic-user');assert.equal(values[3],valid.contactEmail);
 const input=JSON.parse(values[6]);assert.equal(input.contactPhone,valid.contactPhone);assert.equal(input.contactEmail,valid.contactEmail);assert.equal(input.informationConfirmed,true);
});
