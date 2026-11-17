import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  MAX_ASSISTANT_FILES,ASSISTANT_ACCEPT,extractAssistantFile,
  attachmentContext,assistantMessageWithFiles
} from '../assets/chunks/assistant-attachments.mjs';

const chunk = await readFile(new URL('../assets/chunks/library-assistant-I5KUSPHA.mjs',import.meta.url),'utf8');
const css = await readFile(new URL('../assets/library-assistant.css',import.meta.url),'utf8');

test('assistant file input is available in both writing and live modes',()=>{
  assert.match(chunk,/className:"library-attachments"/);
  assert.match(chunk,/type:"file",accept:acceptedFiles,multiple:!0/);
  assert.match(chunk,/className:"button library-attach-button"/);
  assert.match(chunk,/children:\["📎 ",fileBusy\?/u);
  assert.ok(chunk.indexOf('className:"library-attachments"') < chunk.indexOf('h==="live"&&(0,t.jsxs)("section"'));
  assert.ok(chunk.indexOf('className:"library-attachments"') < chunk.indexOf('h==="text"&&(0,t.jsxs)("form"'));
  assert.equal(MAX_ASSISTANT_FILES,3);
  assert.match(ASSISTANT_ACCEPT,/\.pdf/);
  assert.match(ASSISTANT_ACCEPT,/\.docx/);
  assert.match(ASSISTANT_ACCEPT,/\.mp3/);
  assert.match(ASSISTANT_ACCEPT,/\.png/);
  assert.match(css,/\.library-attachments/);
  assert.match(css,/\.library-attachment-chip/);
});

test('small text files are read without network and returned as ephemeral text',async()=>{
  const file={name:'scene.txt',size:38,type:'text/plain',text:async()=> '  المشهد الأول: افتتاح  '};
  const value=await extractAssistantFile(file,()=>{throw Error('Must stay local');});
  assert.equal(value.name,'scene.txt');
  assert.equal(value.text,'المشهد الأول: افتتاح');
  assert.equal(value.format,'نص');
  assert.equal(value.usedOcr,false);
});

test('PDF and Word extraction uses existing authenticated document endpoint',async()=>{
  const requests=[];
  const blob=new Blob(['%PDF-1.7 fake'],{type:'application/pdf'});
  const file=new File([blob],'test.pdf',{type:'application/pdf'});
  const result=await extractAssistantFile(file,async(path,options)=>{
    requests.push({path,options});
    return Response.json({text:'محتوى مستخرج للمراجعة',format:'PDF',usedOcr:false});
  });
  assert.equal(requests.length,1);
  assert.equal(requests[0].path,'/api/import-document');
  assert.equal(requests[0].options.method,'POST');
  assert.equal(requests[0].options.body.get('file').name,'test.pdf');
  assert.equal(result.text,'محتوى مستخرج للمراجعة');
  assert.equal(result.format,'PDF');
});

test('recording uses existing authenticated transcription endpoint with language',async()=>{
  const file=new File(['audio payload'],'recording.m4a',{type:'audio/mp4'});
  const requests=[];
  const result=await extractAssistantFile(file,async(path,options)=>{
    requests.push({path,form:options.body});
    return Response.json({text:'هذا تسجيل صوتي',language:'ar'});
  });
  assert.equal(requests.length,1);
  assert.equal(requests[0].path,'/api/transcribe');
  assert.equal(requests[0].form.get('audio').name,'recording.m4a');
  assert.equal(requests[0].form.get('language'),'ar');
  assert.equal(result.format,'تفريغ صوتي');
});

test('files with unsafe size or extension cannot be sent',async()=>{
  await assert.rejects(()=>extractAssistantFile({name:'big.pdf',size:25_000_001}),/٢٥ ميغابايت/u);
  await assert.rejects(()=>extractAssistantFile({name:'big.mp3',size:8_000_001}),/٨ ميغابايت/u);
  await assert.rejects(()=>extractAssistantFile({name:'run.exe',size:100}),/هذه الصيغة غير مدعومة/u);
  await assert.rejects(()=>extractAssistantFile({name:'empty.pdf',size:0}),/٢٥ ميغابايت/u);
});

test('attachment context clearly marks excerpts and treats files as untrusted sources',()=>{
  const files=[
    {name:'مخطوط.docx',text:'أ'.repeat(12000)},
    {name:'ملخص.txt',text:'ب'.repeat(1800)},
    {name:'تعليق.txt',text:'ج'.repeat(800)},
  ];
  const context=attachmentContext(files,4000);
  assert.match(context,/المرفق 1/u);
  assert.match(context,/المرفق 2/u);
  assert.match(context,/المرفق 3/u);
  assert.match(context,/بيانات غير موثوقة/u);
  assert.match(context,/مقتطف من الملف/u);
  assert.ok(context.length<4350,'keep context inside budget');
  const answer=assistantMessageWithFiles('حلّل الحوارات',files,5700);
  assert.ok(answer.startsWith('حلّل الحوارات'));
  assert.ok(answer.length<=5700);
  assert.ok(!answer.includes('أ'.repeat(6000)));
});

test('writing sends file excerpts and voice channel receives them as realtime input text',()=>{
  assert.match(chunk,/activeFiles.length\?directTask\(r,activeFiles\):r/);
  assert.match(chunk,/execute=isExecution\(r,activeFiles\)/);
  assert.match(chunk,/message:question,history:d/);
  assert.match(chunk,/attachments:files\.length\?\[fileContext\(files,10500\)\]:\[\]/);
  assert.match(chunk,/attachContext\(e\)\{/);
  assert.match(chunk,/for\(let u of this.attachments\)this.send/);
  assert.match(chunk,/m\.current\.attachContext\(fileContext\(\[stored\],4000\)\)/);
  assert.match(chunk,/fileAbort\.current\?\.abort\(\)/);
  assert.match(chunk,/setFiles\(list=>list\.filter\(x=>x\.id!==item\.id\)\)/);
  assert.match(chunk,/D\(\),w\("أزيل المرفق/);
  assert.match(chunk,/disabled:f\|\|_\|\|!x\|\|fileBusy\|\|\(!q\.trim\(\)&&!files\.length\)/);
});
