import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from './template-harness.mjs';
const input = load('../lib/assistant-input.ts');
const long = 'وقائع اصطناعية للتجربة فقط. '.repeat(240) + 'نهاية الوقائع: مبلغ الصلح مثبت.';
test('long Arabic prompt reaches context intact and stays intact in the next turn', () => {
 assert.ok(long.length > 2500 && long.length < 16000);
 const first = input.validateAssistantInput(long, [], 'ar');
 assert.equal(first.message, long); assert.equal(first.messages[0].content, long);
 const next = input.validateAssistantInput('إضافة اختبارية', [...first.messages, {role:'assistant',content:'سؤال اختباري'}], 'ar');
 assert.equal(next.messages[0].content,long); assert.match(next.messages[0].content,/مبلغ الصلح مثبت/);
});
test('exact limit accepted; oversized current/history and short messages rejected explicitly', () => {
 assert.equal(input.validateAssistantInput('س'.repeat(16000),[]).message.length,16000);
 for(const language of ['ar','en','ur']) {
  assert.throws(()=>input.validateAssistantInput('س'.repeat(16001),[],language),{message:input.assistantInputCopy(language).long});
  assert.throws(()=>input.validateAssistantInput('س',[],language),{message:input.assistantInputCopy(language).short});
 }
 assert.throws(()=>input.validateAssistantInput('تفصيل', [{role:'user',content:'س'.repeat(16001)}]), /١٦٬٠٠٠/);
});
test('bounded context rejects overflow without cutting replies or case messages', () => {
 const history = Array.from({length:4},()=>({role:'user',content:'س'.repeat(15000)}));
 assert.throws(()=>input.validateAssistantInput('تفصيل',history),/٦٠٬٠٠٠/);
 const reply = 'اختبار'.repeat(3000);
 assert.equal(input.validateAssistantInput('تفصيل',[{role:'assistant',content:reply}]).messages[0].content,reply);
 const recent = input.validateAssistantInput('تفصيل',Array.from({length:20},(_,i)=>({role:'user',content:'رسالة '+i})));
 assert.equal(recent.messages.length,16);assert.equal(recent.messages[0].content,'رسالة 5');
});
test('normalization is explicit and UTF8 request budget accommodates Arabic context',()=>{
 assert.equal(input.validateAssistantInput('  أول\r\nثان\u0000  ',[]).message,'أول\nثان');
 const body=JSON.stringify({message:'س'.repeat(16000),messages:Array.from({length:3},()=>({role:'user',content:'س'.repeat(14000)})),currentState:{facts:['س'.repeat(60000)]}});
 assert.ok(new TextEncoder().encode(body).length<input.ASSISTANT_REQUEST_BYTES);
});
test('API and browser share validation; browser retains input and does not cap paste',()=>{
 const route=readFileSync(new URL('../app/api/legal/assistant/route.ts',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../app/sabeq-site.tsx',import.meta.url),'utf8');
 assert.match(route,/validateAssistantInput\(data.message, data.messages, language\)/);
 assert.match(route,/readJsonObject\(request, ASSISTANT_REQUEST_BYTES\)/);
 assert.doesNotMatch(route,/slice\(0, 2_500\)/);
 assert.match(ui,/validateAssistantInput\(message, conversationRef.current.messages, language\)/);
 assert.match(ui,/setQuestion\(rawMessage\)/);
 assert.match(ui,/assistant-input-limit/);
});
