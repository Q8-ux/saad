import {test} from 'node:test';
import assert from 'node:assert/strict';
import {load} from './template-harness.mjs';
const renderer=load('../lib/pleading-document.ts');
test('a long first-page claim continues without a sidebar or loss of text',()=>{
 const facts='وقائع اختبار اصطناعية طويلة مع أسماء افتراضية فقط. '.repeat(200);
 const pages=renderer.wideContinuationPages([{title:'صحيفة الدعوى',sidebar:[{text:'بيانات الإعلان'}],blocks:[{text:'الديباجة المعتمدة للاختبار'},{text:facts}],after:[{text:'الطلبات الختامية محفوظة'}]}]);
 assert.equal(pages.length,2);assert.equal(pages[1].sidebar,undefined);
 assert.equal(pages.flatMap(p=>p.blocks).map(b=>b.text).join(' ').replace(/\s+/g,' ').trim(),('الديباجة المعتمدة للاختبار '+facts+' الطلبات الختامية محفوظة').replace(/\s+/g,' ').trim());
 const repeated=renderer.wideContinuationPages(pages);assert.equal(repeated,pages);
});
test('legacy header metadata cannot reappear in preview or printable text; only first page has a sidebar',()=>{
 const doc={paper:'A4',title:'صحيفة الدعوى',border:false,template:{version:'test'},pages:[{title:'صحيفة الدعوى',ministry:'وزارة العدل',court:'محكمة اختبار الترويسة',emblem:{dataUrl:'data:image/png;base64,xx'},blocks:[{text:'المحكمة المختصة مذكورة ضمن وقائع القضية.'}],sidebar:[{text:'إعلان'}]},{blocks:[{text:'الصفحة التالية كاملة العرض'}],sidebar:[{text:'هامش قديم يجب إخفاؤه'}]}]};
 const html=renderer.renderPleadingHtml(doc),text=renderer.pleadingText(doc);
 for(const value of [html,text])assert.doesNotMatch(value,/وزارة العدل|محكمة اختبار الترويسة|هامش قديم|data:image/);
 assert.equal((html.match(/class="sidebar"/g)||[]).length,1);
 assert.match(html,/@page\{size:A4;margin:0\}@page:first\{margin:10mm 8.5mm 10mm 6mm\}/);
 assert.match(html,/\.continuation-page\{padding:0\}/);
 assert.match(text,/المحكمة المختصة/);
});
test('archived form captions are removed without erasing substantive court or ministry references',()=>{
 const doc={paper:'A4',title:'صحيفة استئناف',border:true,template:{version:'test'},pages:[{title:'صحيفة استئناف',ministry:'وزارة العدل',court:'إدارة كتاب محكمة الاستئناف',emblem:'data:image/png;base64,old',blocks:[{text:'تعلن وزارة العدل أمام محكمة الاستئناف بحسب بيانات القضية.'}],sidebar:[{text:'وزارة العدل'},{text:'إدارة كتاب محكمة الاستئناف'},{text:'قسم ضباط الدعاوى'},{text:'رقم: 0012/2026'},{text:'توقيع المستأنف:'}]},{blocks:[{text:'باقي الطلبات محفوظة ومحاذاة إلى اليمين.'}],sidebar:[{text:'هامش قديم'}]}]};
 const html=renderer.renderPleadingHtml(doc),text=renderer.pleadingText(doc);
 for(const value of [html,text]){assert.doesNotMatch(value,/إدارة كتاب محكمة الاستئناف|قسم ضباط الدعاوى|هامش قديم|data:image/);assert.match(value,/تعلن وزارة العدل أمام محكمة الاستئناف/);assert.match(value,/0012\/2026|0012&#39;/);assert.match(value,/توقيع المستأنف/);}
 assert.equal((html.match(/first-page framed/g)||[]).length,1);assert.doesNotMatch(html,/continuation-page framed/);
 assert.match(html,/<col style="width:83%"><col style="width:17%">/);
 const clean=renderer.presentationPleadingPages(doc.pages);assert.equal(clean[0].ministry,undefined);assert.equal(clean[0].emblem,undefined);assert.equal(clean[1].sidebar,undefined);
});
