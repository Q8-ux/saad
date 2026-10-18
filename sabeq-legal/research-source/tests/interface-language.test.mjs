import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url).pathname;
// Render the real components with deterministic state, without network calls or
// altering production exports. State names keep fixtures independent of order.
function modules(states = {}, globals = {}) {
  const cache = new Map();
  function load(file) {
    file = resolve(root, file);
    if (cache.has(file)) return cache.get(file);
    let source = readFileSync(file, 'utf8');
    if (file.endsWith('sabeq-site.tsx')) source += '\nexport { Assistant, MemoWizard, AuthGate, ModalShell };';
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const edits = [];
    function visit(node) {
      if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) && node.initializer && ts.isCallExpression(node.initializer)) {
        const name = node.name.elements[0].name.getText(ast);
        if (node.initializer.expression.getText(ast) === 'useState' && Object.hasOwn(states, name)) edits.push([node.initializer.getStart(ast), node.initializer.end, `useState(${JSON.stringify(states[name])})`]);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
    for (const [start, end, replacement] of edits.sort((a,b) => b[0]-a[0])) source = source.slice(0,start)+replacement+source.slice(end);
    const exports = {}; cache.set(file, exports);
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    vm.runInNewContext(js, { exports, require(name) {
      if (name === 'cloudflare:workers') return { env: { OPENAI_API_KEY: 'synthetic' } };
      if (name.startsWith('@/') || name.startsWith('.')) {
        const path = name.startsWith('@/') ? resolve(root,name.slice(2)) : resolve(dirname(file),name);
        if (path.endsWith('.json')) return JSON.parse(readFileSync(path,'utf8'));
        const target = [path+'.ts',path+'.tsx',path+'/index.ts'].find(existsSync);
        if (!target) throw new Error('Missing test module: '+path);
        return load(target);
      }
      return require(name);
    }, console, URL, TextEncoder, TextDecoder, Uint8Array, DataView, Blob, File, FormData, Request, Response, Headers, AbortSignal, AbortController, Error, performance, setTimeout, clearTimeout, btoa, atob, ...globals });
    return exports;
  }
  return load;
}
const load = modules();
const locale = load('lib/interface-language.ts');
const copy = load('app/site-content.ts').copy;
const sample = {title:'مذكرة بدفاع', kind:'memorandum', template:{id:'synthetic',version:1,kind:'claim',title:'صحيفة الدعوى',sourceFilename:'approved-template.doc',sourceSha256:'synthetic',approvedAt:'2026-01-01'},paper:'A4',border:true,pages:[{title:'مذكرة بدفاع',court:'المحكمة الكلية',blocks:[{text:'وقائع اصطناعية للاختبار فقط. الرقم 0012/2026'}]}],reviewNotes:[],approval:''};
const props = language => ({language,t:copy[language],token:'',initialSession:null,onSession(){},openBooking(){},startMemo(){}});
const outsideMemo = html => html.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/g,'').replace(/<pre lang="ar" dir="rtl">[\s\S]*?<\/pre>/g,'');
test('all languages retain one footer policy link and omit repeated privacy notices in tools', () => {
  for (const language of ['ar','en','ur']) {
    const components=modules({language})('app/sabeq-site.tsx');
    const html=renderToStaticMarkup(React.createElement(components.default));
    assert.equal((html.match(/class="privacy-link"/g)||[]).length,1);
    const footer=html.slice(html.indexOf('class="container footer-bottom"'),html.indexOf('</footer>'));
    assert.ok(footer.includes(`./privacy${language==='ar'?'':'-'+language}.html`));
    for (const Component of [components.Assistant,components.MemoWizard]) {
      const content=renderToStaticMarkup(React.createElement(Component,props(language)));
      assert.doesNotMatch(content,/privacy-notice|memo-guest-notice|class="privacy-link"/);
    }
  }
});
function assertEnglish(html) {
  assert.doesNotMatch(outsideMemo(html), /[\u0600-\u06ff]/, 'English controls, guidance and accessible labels must have no Arabic copy');
}
for (const language of ['en','ur']) {
  test(`${language} assistant renders localized court notice, actions and classification`, () => {
    const intake = {caseType:'عمالي',caseStage:'قبل التقاضي',court:'المحكمة الكلية',courtCircuit:'الدائرة العمالية',jurisdictionConfidence:'low',facts:['Synthetic case facts for testing.'],requests:[],legalIssues:[],importantDates:[],documentsNeeded:[],missingInformation:[],jurisdictionMissing:[],contradictions:[],nextQuestions:[],caseSummary:'Synthetic case.',jurisdictionReason:'',progress:50,memoPrefill:{},legalBasis:[],precedentMatches:[],analysisWarnings:[]};
    const components = modules()('app/sabeq-site.tsx');
    const html = renderToStaticMarkup(React.createElement(components.Assistant,{...props(language),initialSession:{question:'',messages:[],intake}}));
    assert.ok(html.includes(locale.interfaceText(language,'التوجيه للمحكمة مبدئي، ويجب اعتماده من محامٍ بعد مراجعة المستندات والمواعيد.')));
    assert.ok(html.includes(locale.interfaceText(language,'أدوات المحادثة')));
    assert.ok(html.includes(locale.interfaceText(language,'الدائرة العمالية')));
    if (language === 'en') assertEnglish(html);
    else for (const phrase of ['التوجيه للمحكمة مبدئي','أدوات المحادثة','المحكمة المبدئية','Case understanding']) assert.ok(!html.includes(phrase),phrase);
  });
  for (const step of [0,1,2,3]) test(`${language} memo form step ${step} localizes tools and guidance`, () => {
    const {MemoWizard}=modules({step})('app/sabeq-site.tsx');
    const html=renderToStaticMarkup(React.createElement(MemoWizard,props(language)));
    if(language==='en') assertEnglish(html);
    else { assert.ok(html.includes(copy.ur.steps[step])); assert.ok(!html.includes('اتركها فارغة')); }
  });
  test(`${language} memo result keeps document Arabic RTL while translating surrounding tools`, () => {
    const {MemoWizard}=modules({memo:'وقائع اصطناعية للاختبار فقط.',memoDocument:sample,memoAnalysis:{lawCount:0,cassationCount:0,sources:[]}})('app/sabeq-site.tsx');
    const html=renderToStaticMarkup(React.createElement(MemoWizard,props(language)));
    assert.match(html,/<pre lang="ar" dir="rtl">/);
    assert.ok(html.includes('وقائع اصطناعية للاختبار فقط.'));
    assert.ok(html.includes(locale.interfaceText(language,'طباعة')));
    assert.ok(html.includes(locale.interfaceText(language,'عرض النص الكامل')));
    if(language==='en') assertEnglish(html);
  });
}
test('form labels are complete; source quotations and identifiers stay unchanged', () => {
  const fields={...load('lib/pleading-document.ts').pleadingFields,...load('lib/memo-dictation.ts').memoVoiceFields};
  for(const label of Object.values(fields)) assert.doesNotMatch(locale.interfaceLabel(label,'en'),/[\u0600-\u06ff]/,label);
  for(const language of ['en','ur']) assert.equal(locale.interfaceLabel('نص أصلي ورقم 0012/2026',language),'نص أصلي ورقم 0012/2026');
  assert.equal(locale.canonicalLegalValue('Court of Appeal'),'محكمة الاستئناف');
  assert.equal(locale.canonicalLegalValue('Appellant'),'مستأنف');
  assert.equal(locale.canonicalLegalValue('مدعا علیہ'),'مدعى عليه');
  assert.equal(locale.interfaceError(new Error('خطأ خادم غير مترجم'),'en','Please try again.'),'Please try again.');
});
test('unsupported authorities are removed and absent-source warnings follow the selected language', () => {
  const review=load('lib/legal-tools.ts').reviewToolOutput;
  for(const [language,text] of [['ar','المادة 9999'],['en','Article 9999'],['ur','دفعہ ۹۹۹۹']]) {
    const result=review({text,findings:[],missing:[],passageIds:['م99:1']},'Synthetic test',[],language);
    assert.doesNotMatch(result.text,/9999|۹۹۹۹/);
    assert.equal(result.sources.length,0);
    assert.ok(result.warnings.includes(locale.interfaceText(language,'لا يوجد سند قانوني معتمد لهذه النتيجة. لا تثبت الملاحظات وحدها البطلان أو صحة الموقف القانوني.')));
    if(language==='en') assertEnglish(JSON.stringify(result));
  }
});
test('tool prompts use the interface language in one call and retain the verified-source restriction', async () => {
  for(const language of ['en','ur']) {
    const calls=[];
    const api=modules({}, {fetch:async(_url,init)=>{calls.push(JSON.parse(init.body));return Response.json({output_text:JSON.stringify({text:'Synthetic draft',findings:[],missing:[],passageIds:[]})});}})('lib/openai.ts');
    await api.runLegalTool({action:'draft',text:'Synthetic test facts',language,evidence:'',passageIds:[]});
    assert.equal(calls.length,1);
    assert.equal(JSON.parse(calls[0].input).language,language);
    assert.match(calls[0].instructions,/حصراً من verifiedSources/);
    assert.match(calls[0].instructions,/بما فيها تحسين الصياغة/);
    assert.doesNotMatch(calls[0].instructions,/حوّل الكلام الدارج إلى عربية واضحة/);
  }
});
