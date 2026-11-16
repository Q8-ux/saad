import test from 'node:test';
import assert from 'node:assert/strict';
import {extractDocument,MAX_IMPORT_BYTES} from './document-import.mjs';

test('text PDF is extracted without OCR when it already contains writing',async()=>{
 const calls=[];
 const run=async(command,args)=>{calls.push([command,args]);if(command==='pdftotext')return'الحلقة 1\nالمشهد 1 - داخلي - البيت - ليل\nسعد: مرحبًا بكم في التجربة';throw new Error('unexpected '+command);};
 const result=await extractDocument({buffer:Buffer.from('%PDF-1.7 synthetic'),filename:'script.pdf',mimeType:'application/pdf'},{run});
 assert.equal(result.format,'PDF');assert.equal(result.usedOcr,false);assert.match(result.text,/سعد: مرحبًا/u);assert.deepEqual(calls.map(item=>item[0]),['pdftotext']);
});

test('image import uses Arabic and English OCR without exposing a format choice',async()=>{
 let invocation;
 const run=async(command,args)=>{invocation=[command,args];return'المشهد 1\nنورة: صباح الخير';};
 const result=await extractDocument({buffer:Buffer.from([137,80,78,71,13,10,26,10,1,2,3]),filename:'scan.png',mimeType:'image/png'},{run});
 assert.equal(result.usedOcr,true);assert.equal(invocation[0],'tesseract');assert.ok(invocation[1].includes('ara+eng'));assert.match(result.warnings[0],/OCR/u);
});

test('zipped Word-family documents extract ordered XML text with external definitions blocked',async()=>{
 const run=async(command,args)=>{
  assert.equal(command,'unzip');
  if(args[0]==='-Z1')return'word/document.xml\nword/footnotes.xml\n';
  if(args.at(-1)==='word/document.xml')return'<w:document><w:p><w:r><w:t>المشهد الأول</w:t></w:r></w:p><w:p><w:r><w:t>سعد: أهلًا</w:t></w:r></w:p></w:document>';
  return'<w:footnotes><w:p><w:r><w:t>ملاحظة الكاتب</w:t></w:r></w:p></w:footnotes>';
 };
 const result=await extractDocument({buffer:Buffer.from('PK\u0003\u0004synthetic'),filename:'work.docx'},{run});
 assert.equal(result.format,'Word (DOCX)');assert.match(result.text,/المشهد الأول/u);assert.match(result.text,/ملاحظة الكاتب/u);
 const unsafe=async(command,args)=>args[0]==='-Z1'?'word/document.xml\n':'<!DOCTYPE x [<!ENTITY ext SYSTEM "https://example.invalid/x">]><w:document>&ext;</w:document>';
 await assert.rejects(()=>extractDocument({buffer:Buffer.from('PK\u0003\u0004synthetic'),filename:'unsafe.docx'},{run:unsafe}),/تعريفات خارجية/u);
});

test('plain unknown text is accepted while oversized input is rejected',async()=>{
 const result=await extractDocument({buffer:Buffer.from('الفصل الأول\nهذه فقرة من كتاب.'),filename:'manuscript'});
 assert.equal(result.format,'نص');assert.match(result.text,/الفصل الأول/u);
 await assert.rejects(()=>extractDocument({buffer:Buffer.alloc(MAX_IMPORT_BYTES+1),filename:'large.pdf'}),/٢٥ ميغابايت/u);
});
