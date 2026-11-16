import {execFile} from 'node:child_process';
import {mkdtemp, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {basename, extname, join} from 'node:path';
import {promisify} from 'node:util';

const execFileAsync=promisify(execFile);
export const MAX_IMPORT_BYTES=25_000_000;
const MAX_TEXT_BYTES=2_000_000;
const MAX_COMMAND_OUTPUT=6_000_000;
const MAX_OCR_PAGES=60;
const OCR_LANGUAGES='ara+eng';

const labels={
 pdf:'PDF',doc:'Word قديم (DOC)',docx:'Word (DOCX)',odt:'OpenDocument (ODT)',rtf:'Rich Text (RTF)',wps:'WPS Writer',
 ppt:'PowerPoint قديم (PPT)',pptx:'PowerPoint (PPTX)',odp:'OpenDocument Presentation',key:'Apple Keynote',
 xls:'Excel قديم (XLS)',xlsx:'Excel (XLSX)',ods:'OpenDocument Spreadsheet',numbers:'Apple Numbers',
 epub:'كتاب EPUB',pages:'Apple Pages',png:'صورة PNG',jpg:'صورة JPEG',jpeg:'صورة JPEG',webp:'صورة WebP',
 bmp:'صورة BMP',tif:'صورة TIFF',tiff:'صورة TIFF',heic:'صورة HEIC',txt:'نص',html:'HTML',xml:'XML',csv:'CSV',
};
const zipDocuments=new Set(['docx','odt','pptx','odp','xlsx','ods','epub','pages','key','numbers']);
const imageFormats=new Set(['png','jpg','jpeg','webp','bmp','tif','tiff','heic']);
const oldOffice=new Set(['doc','ppt','xls','wps','rtf']);

function problem(message,status=422){const error=new Error(message);error.status=status;return error;}
function cleanName(value){return basename(String(value||'document')).replace(/[^\p{Letter}\p{Number}._ -]+/gu,'_').slice(0,180)||'document';}
function extension(value){return extname(String(value||'')).slice(1).toLowerCase();}
function decodeEntities(value){
 const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
 return value.replace(/&#(x[0-9a-f]+|\d+);|&(amp|lt|gt|quot|apos|nbsp);/giu,(match,numeric,name)=>{
  if(name)return named[name.toLowerCase()];
  const code=numeric.toLowerCase().startsWith('x')?Number.parseInt(numeric.slice(1),16):Number.parseInt(numeric,10);
  return Number.isInteger(code)&&code>=0&&code<=0x10ffff?String.fromCodePoint(code):'�';
 });
}
function normalizeText(value){
 return String(value??'').replace(/^\uFEFF/u,'').replace(/\r\n?/gu,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ufffe\uffff]/gu,'').replace(/[ \t]+\n/gu,'\n').replace(/\n{4,}/gu,'\n\n\n').trim().normalize('NFC');
}
function markupText(value){
 const source=String(value||'');
 if(/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet|<xi:include|<xinclude/iu.test(source))throw problem('يحتوي المستند تعريفات خارجية غير مسموحة.');
 return normalizeText(decodeEntities(source
  .replace(/<(?:br|hr|w:br|w:cr)\b[^>]*\/?\s*>/giu,'\n')
  .replace(/<\/?(?:p|div|li|h[1-6]|tr|table|section|article|text:p|text:h|w:p|a:p|a:r|si|row)\b[^>]*>/giu,'\n')
  .replace(/<[^>]+>/gu,' ')
  .replace(/[ \t]{2,}/gu,' ')));
}
function textIsUseful(value){
 const source=normalizeText(value);
 if(source.length<3||source.includes('\u0000'))return false;
 const letters=(source.match(/\p{Letter}/gu)||[]).length;
 const replacements=(source.match(/�/gu)||[]).length;
 return letters>=3&&replacements/Math.max(source.length,1)<.02;
}
function boundedText(value){
 const output=normalizeText(value);
 if(!textIsUseful(output))throw problem('لم يُعثر على نص قابل للقراءة داخل الملف.');
 if(Buffer.byteLength(output)>MAX_TEXT_BYTES)throw problem('النص المستخرج أكبر من الحد المسموح (٢ ميغابايت). قسّم الملف ثم أعد المحاولة.',413);
 return output;
}
function sniff(buffer,filename,mimeType=''){
 let ext=extension(filename);
 const head=buffer.subarray(0,16);
 const ascii=head.toString('latin1');
 if(ascii.startsWith('%PDF-'))return'pdf';
 if(head.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return'png';
 if(head[0]===0xff&&head[1]===0xd8&&head[2]===0xff)return'jpg';
 if(ascii.startsWith('RIFF')&&buffer.subarray(8,12).toString('ascii')==='WEBP')return'webp';
 if(ascii.startsWith('{\\rtf'))return'rtf';
 if(!ext&&/^text\//iu.test(mimeType))ext='txt';
 return ext;
}
async function nativeRun(command,args,options={}){
 try{
  const result=await execFileAsync(command,args,{encoding:options.encoding??'utf8',timeout:options.timeout??45_000,maxBuffer:options.maxBuffer??MAX_COMMAND_OUTPUT,windowsHide:true});
  return result.stdout;
 }catch(error){
  if(error?.code==='ENOENT')throw problem('محرك قراءة هذا النوع من الملفات غير متاح مؤقتًا.',503);
  throw error;
 }
}
async function command(run,name,args,options={}){
 try{return await run(name,args,options);}catch(error){if(error?.status)throw error;const wrapped=problem('تعذر استخراج النص من الملف. تأكد من أن الملف غير مشفّر أو تالف.');wrapped.cause=error;throw wrapped;}
}
async function zipEntries(path,run){
 const output=String(await command(run,'unzip',['-Z1',path],{timeout:20_000,maxBuffer:1_000_000}));
 const entries=output.split(/\r?\n/u).map(item=>item.trim()).filter(Boolean);
 if(entries.length>10_000)throw problem('الأرشيف الداخلي للملف أكبر من الحد الآمن.');
 return entries;
}
async function zipEntry(path,entry,run,encoding='utf8'){
 if(!entry||entry.includes('\u0000'))throw problem('بنية الملف المضغوط غير صالحة.');
 return command(run,'unzip',['-p',path,entry],{encoding,timeout:25_000,maxBuffer:MAX_COMMAND_OUTPUT});
}
const natural=(a,b)=>a.localeCompare(b,'en',{numeric:true,sensitivity:'base'});

async function extractPdf(path,dir,run){
 let direct='';
 try{direct=String(await command(run,'pdftotext',['-enc','UTF-8','-layout',path,'-'],{timeout:45_000}));}catch(error){
  if(/password|encrypted/iu.test(String(error?.cause?.stderr||'')))throw problem('ملف PDF محمي بكلمة مرور ولا يمكن قراءته.');
 }
 if(textIsUseful(direct)&&((direct.match(/\p{Letter}/gu)||[]).length>=20))return{text:boundedText(direct),format:'PDF',usedOcr:false,warnings:[]};
 let pages=1;
 try{const info=String(await command(run,'pdfinfo',[path],{timeout:15_000,maxBuffer:300_000}));pages=Math.max(1,Number.parseInt(/^Pages:\s+(\d+)/imu.exec(info)?.[1]||'1',10));}catch{}
 const selected=Math.min(pages,MAX_OCR_PAGES);
 const prefix=join(dir,'page');
 await command(run,'pdftoppm',['-f','1','-l',String(selected),'-r','160','-jpeg','-jpegopt','quality=82',path,prefix],{timeout:90_000,maxBuffer:500_000});
 const images=(await readdir(dir)).filter(name=>/^page-\d+\.jpg$/iu.test(name)).sort(natural);
 if(!images.length)throw problem('تعذر تحويل صفحات PDF المصوّرة إلى نص.');
 const chunks=[];
 for(let index=0;index<images.length;index+=2){
  const batch=images.slice(index,index+2);
  const values=await Promise.all(batch.map(name=>command(run,'tesseract',[join(dir,name),'stdout','-l',OCR_LANGUAGES,'--psm','6'],{timeout:45_000,maxBuffer:1_000_000}).catch(()=>'')));
  chunks.push(...values.map(String));
 }
 const warnings=['تم استخدام التعرّف الضوئي OCR لأن صفحات PDF مصوّرة؛ راجع الأسماء وعلامات الحوار قبل الحفظ.'];
 if(pages>selected)warnings.push(`حلّل النظام أول ${selected.toLocaleString('ar-KW')} صفحة من أصل ${pages.toLocaleString('ar-KW')} حفاظًا على استقرار الخدمة. قسّم الملف لاستيراد البقية.`);
 return{text:boundedText(chunks.join('\n\n')),format:'PDF مصوّر (OCR)',usedOcr:true,warnings,pages,processedPages:selected};
}

async function extractImage(path,ext,dir,run){
 let source=path;
 if(ext==='heic'){
  source=join(dir,'image.png');
  await command(run,'convert',[path,'-auto-orient','-strip',source],{timeout:45_000,maxBuffer:500_000});
 }
 const output=await command(run,'tesseract',[source,'stdout','-l',OCR_LANGUAGES,'--psm','6'],{timeout:60_000,maxBuffer:MAX_COMMAND_OUTPUT});
 return{text:boundedText(output),format:`${labels[ext]||'صورة'} (OCR)`,usedOcr:true,warnings:['استُخرج النص من صورة بواسطة OCR؛ راجع الأسماء وعلامات الحوار قبل الحفظ.']};
}

async function extractZipDocument(path,ext,dir,run){
 const entries=await zipEntries(path,run);
 const lower=new Map(entries.map(entry=>[entry.toLowerCase(),entry]));
 if(['pages','key','numbers'].includes(ext)){
  const preview=entries.find(entry=>/(?:^|\/)(?:quicklook\/)?preview\.pdf$/iu.test(entry));
  if(!preview)throw problem('لا يحتوي ملف Apple على معاينة PDF قابلة للقراءة. صدّره PDF أو Word ثم أعد المحاولة.');
  const previewBytes=await zipEntry(path,preview,run,'buffer');
  const previewPath=join(dir,'preview.pdf');await writeFile(previewPath,previewBytes);
  const result=await extractPdf(previewPath,dir,run);return{...result,format:`${labels[ext]} · ${result.format}`};
 }
 let chosen=[];
 if(ext==='docx')chosen=['word/document.xml','word/footnotes.xml','word/endnotes.xml'].map(key=>lower.get(key)).filter(Boolean);
 else if(['odt','ods','odp'].includes(ext))chosen=[lower.get('content.xml')].filter(Boolean);
 else if(ext==='pptx')chosen=entries.filter(entry=>/^ppt\/(?:slides\/slide\d+|notesSlides\/notesSlide\d+)\.xml$/iu.test(entry)).sort(natural);
 else if(ext==='xlsx')chosen=entries.filter(entry=>/^xl\/(?:sharedStrings|worksheets\/sheet\d+)\.xml$/iu.test(entry)).sort(natural);
 else if(ext==='epub')chosen=entries.filter(entry=>/\.(?:xhtml?|html?)$/iu.test(entry)&&!/(?:nav|toc)\.(?:xhtml?|html?)$/iu.test(entry)).sort(natural);
 if(!chosen.length)throw problem('لا يحتوي الملف على صفحات نصية قابلة للقراءة.');
 if(chosen.length>1_000)throw problem('عدد الصفحات الداخلية أكبر من الحد الآمن.');
 const texts=[];
 for(const entry of chosen){
  const raw=await zipEntry(path,entry,run);
  const extracted=markupText(raw);
  if(extracted)texts.push(extracted);
  if(Buffer.byteLength(texts.join('\n\n'))>MAX_TEXT_BYTES)throw problem('النص المستخرج أكبر من الحد المسموح (٢ ميغابايت). قسّم الملف ثم أعد المحاولة.',413);
 }
 return{text:boundedText(texts.join('\n\n')),format:labels[ext]||ext.toUpperCase(),usedOcr:false,warnings:[]};
}

async function extractOldOffice(path,ext,run){
 const attempts=ext==='doc'?[['antiword',['-w','0',path]],['catdoc',['-w',path]]]
  :ext==='wps'?[['catdoc',['-w',path]],['antiword',['-w','0',path]]]
  :ext==='ppt'?[['catppt',[path]]]
  :ext==='xls'?[['xls2csv',[path]]]
  :[['unrtf',['--text','--nopict',path]]];
 let last;
 for(const [name,args]of attempts){try{const value=await command(run,name,args,{timeout:45_000});if(textIsUseful(value))return{text:boundedText(value),format:labels[ext]||ext.toUpperCase(),usedOcr:false,warnings:[]};}catch(error){last=error;}}
 throw last||problem('تعذر قراءة الملف المكتبي القديم.');
}

export async function extractDocument(input,options={}){
 const buffer=Buffer.isBuffer(input?.buffer)?input.buffer:Buffer.from(input?.buffer||[]);
 if(!buffer.length)throw problem('الملف فارغ.');
 if(buffer.length>MAX_IMPORT_BYTES)throw problem('حجم الملف أكبر من ٢٥ ميغابايت.',413);
 const filename=cleanName(input?.filename);
 const ext=sniff(buffer,filename,input?.mimeType);
 const run=options.run||nativeRun;
 const dir=await mkdtemp(join(tmpdir(),'studio-import-'));
 const path=join(dir,filename.includes('.')?filename:`document.${ext||'bin'}`);
 try{
  await writeFile(path,buffer,{mode:0o600});
  if(ext==='pdf')return await extractPdf(path,dir,run);
  if(imageFormats.has(ext))return await extractImage(path,ext,dir,run);
  if(zipDocuments.has(ext))return await extractZipDocument(path,ext,dir,run);
  if(oldOffice.has(ext))return await extractOldOffice(path,ext,run);
  const decoded=buffer.toString('utf8');
  if(textIsUseful(decoded))return{text:boundedText(['html','htm','xml'].includes(ext)?markupText(decoded):decoded),format:labels[ext]||'نص',usedOcr:false,warnings:[]};
  throw problem('صيغة الملف غير مدعومة للتحليل المباشر. صدّره PDF أو Word أو نص ثم أعد المحاولة.',415);
 }finally{await rm(dir,{recursive:true,force:true});}
}
