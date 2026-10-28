import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
function load(path,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,require:name=>name in deps?deps[name]:require(name),URL,Intl});return exports;}
const handoff=load('../lib/memo-handoff.ts'),procedure=load('../lib/procedural-position.ts');
const journey=load('../lib/memo-journey.ts',{'./procedural-position':procedure});
const dictation=load('../lib/memo-dictation.ts',{'./pleading-document':{pleadingFields:{}}});
const localization=load('../lib/interface-language.ts');
const VoiceInput=load('../app/memo-voice-input.tsx',{'@/lib/legal-voice':{MAX_AUDIO_BYTES:12000000},'@/lib/memo-dictation':dictation,'@/lib/interface-language':localization}).default;
const source=readFileSync(new URL('../app/sabeq-site.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('sabeq-site.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const functions=ast.statements.filter(node=>ts.isFunctionDeclaration(node)&&['Field','CustomComboBox','MemoWizard'].includes(node.name?.text)).map(node=>node.getText(ast)).join('\n');
const exports={};
vm.runInNewContext(ts.transpileModule('import {useState,useEffect,useMemo,useRef} from "react";\n'+functions+'\nexport {MemoWizard};',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require,...handoff,...procedure,...journey,...dictation,...require('lucide-react'),...load('../lib/sadad-client.ts'),...load('../lib/memo-generation.ts'),interfaceLabel:localization.interfaceLabel,tr:localization.interfaceText,pleadingFields:{},selectPleadingKind:()=>"memorandum",emptyAnalysisFields:{},MemoVoiceInput:VoiceInput,ProceduralPositionView:()=>null,Intl});
const {copy}=load('../app/site-content.ts');
const state={memoPrefill:{facts:'وقائع اصطناعية سبق ذكرها في المحادثة',requests:'طلب اصطناعي سبق ذكره',clientName:'اسم اصطناعي أول',otherParty:'اسم اصطناعي ثان',caseType:'مدني',court:'المحكمة الكلية',partyRole:'مدعٍ'}};
const render=(intake,language='ar')=>renderToStaticMarkup(React.createElement(exports.MemoWizard,{t:copy[language],language,token:'',active:true,initialData:null,assistantSession:{messages:[{role:'user',content:'قضية اصطناعية'}],intake},openAssistant(){}}));
test('alternate memo entry renders previously supplied details and a collapsed optional story editor',()=>{
 const html=render(state);
 for(const name of ['clientName','otherParty','caseType','court','partyRole'])assert.ok(html.includes(`value="${state.memoPrefill[name]}"`),name);
 assert.match(html,/<dd>وقائع اصطناعية سبق ذكرها في المحادثة<\/dd>/);
 assert.match(html,/<dd>طلب اصطناعي سبق ذكره<\/dd>/);
 assert.match(html,/<details><summary>تعديل الوقائع والطلبات<\/summary>/);
 assert.match(html,/أوافق وأولّد المذكرة/);
});
test('missing requests remain visible for completion without erasing known facts',()=>{
 const html=render({...state,memoPrefill:{...state.memoPrefill,requests:''}});
 assert.match(html,/<details open=""><summary>تعديل الوقائع والطلبات<\/summary>/);
 assert.match(html,/وقائع اصطناعية سبق ذكرها في المحادثة/);
});
test('optional editing retains English and Urdu labels',()=>{
 assert.match(render(state,'en'),/<details><summary>Edit facts and requests<\/summary>/);
 assert.match(render(state,'ur'),/<details><summary>حقائق اور مطالبات میں ترمیم<\/summary>/);
});
