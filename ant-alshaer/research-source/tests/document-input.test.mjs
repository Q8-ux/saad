import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {zipSync,strToU8} from 'fflate';
import {setRuntimeBindings} from '../lib/runtime-bindings.ts';
import {mediaSourceMode} from '../lib/media-files.ts';

const output=new URL('../.sites-runtime/document-input-test.mjs',import.meta.url);
await mkdir(new URL('../.sites-runtime/',import.meta.url),{recursive:true});
await build({entryPoints:[new URL('../lib/document-text.ts',import.meta.url).pathname],outfile:output.pathname,bundle:true,packages:'external',platform:'node',format:'esm',logLevel:'silent'});
const {localDocumentText,extractStoryDocument,DocumentTextError}=await import(output.href);
const story='عاد صديق من سفر طويل فاستقبله أصحابه بفرح ووفاء';

test('recognizes supported documents and images without accepting executable or SVG uploads',()=>{
 for(const filename of ['story.pdf','story.docx','story.txt','story.md'])assert.equal(mediaSourceMode(filename,''),'document');
 for(const filename of ['story.png','story.jpg','story.jpeg','story.webp'])assert.equal(mediaSourceMode(filename,''),'image');
 for(const filename of ['story.exe','story.html','story.svg','story.zip'])assert.equal(mediaSourceMode(filename,''),null);
 assert.equal(mediaSourceMode('story.mp3','audio/mpeg'),'audio');assert.equal(mediaSourceMode('story.mp4','video/mp4'),'video');
});
test('reads complete UTF-8/UTF-16 text and DOCX paragraphs, names and XML entities locally',()=>{
 assert.equal(localDocumentText(new TextEncoder().encode(story),'story.txt'),story);
 assert.equal(localDocumentText(new Uint8Array(Buffer.concat([Buffer.from([255,254]),Buffer.from(story,'utf16le')])),'story.txt'),story);
 const xml='<w:document xmlns:w="urn:word"><w:body><w:p><w:r><w:t>سالم: أهلًا &amp; مرحبًا</w:t></w:r></w:p><w:p><w:r><w:t>عدت يا صديقي</w:t><w:tab/><w:t>بسلام</w:t></w:r></w:p></w:body></w:document>';
 const docx=zipSync({'word/document.xml':strToU8(xml),'ignored.xml':strToU8('لا يدخل هذا في القصة')});
 assert.equal(localDocumentText(docx,'story.docx'),'سالم: أهلًا & مرحبًا\nعدت يا صديقي\tبسلام');
});
test('rejects a malformed archive, XML entities and oversized text instead of silently truncating',()=>{
 assert.throws(()=>localDocumentText(new TextEncoder().encode('not zip'),'story.docx'),DocumentTextError);
 const unsafe=zipSync({'word/document.xml':strToU8('<!DOCTYPE x [<!ENTITY x "unsafe">]><w:t>&x;</w:t>')});
 assert.throws(()=>localDocumentText(unsafe,'story.docx'),DocumentTextError);
 assert.throws(()=>localDocumentText(new TextEncoder().encode('أ'.repeat(30001)),'story.txt'),e=>e.code==='DOCUMENT_TOO_LONG');
 const bomb=zipSync({'word/document.xml':new Uint8Array(2_000_001)});assert.throws(()=>localDocumentText(bomb,'story.docx'),DocumentTextError);
});
test('PDF and image reading use the correct multimodal payload and reject incomplete extraction',async()=>{
 setRuntimeBindings({});let request;
 const client={responses:{parse:async value=>{request=value;return{status:'completed',output_parsed:{text:story,complete:true}};}}};
 assert.equal(await extractStoryDocument(new File(['%PDF-1.7\nfixture'],'story.pdf'),client),story);
 assert.equal(request.store,false);assert.equal(request.input[1].content[1].type,'input_file');assert.match(request.input[1].content[1].file_data,/^data:application\/pdf;base64,/);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6xM0AAAAASUVORK5CYII=','base64');
 await extractStoryDocument(new File([png],'story.png'),client);assert.equal(request.input[1].content[1].type,'input_image');assert.match(request.input[1].content[1].image_url,/^data:image\/png;base64,/);
 const partial={responses:{parse:async()=>({status:'incomplete',output_parsed:{text:'جزء',complete:false}})}};
 await assert.rejects(extractStoryDocument(new File(['%PDF-1.7\nfixture'],'story.pdf'),partial),e=>e.code==='DOCUMENT_INCOMPLETE');
 await assert.rejects(extractStoryDocument(new File(['<script>unsafe</script>'],'story.png'),client),DocumentTextError);
});

// Exercise the existing upload route with isolated account storage. No live
// provider, account, file or database is used by these fixtures.
class FixtureArchiveError extends Error {constructor(status,message){super(message);this.status=status;}}
const records=new Map();let activeUser={id:'document-writer-a'};
globalThis.__documentFixture={ArchiveError:FixtureArchiveError,requireUser:()=>{if(!activeUser)throw new FixtureArchiveError(401,'signin');return activeUser;},save:async(user,input)=>{const id=crypto.randomUUID();records.set(id,{userId:user.id,bytes:Buffer.from(await input.file.arrayBuffer()),sourceMode:input.sourceMode,state:'saved'});return{submissionId:id};},transcript:async(user,id,text)=>{const row=records.get(id);assert.equal(row.userId,user);row.text=text;},failed:async(user,id)=>{const row=records.get(id);assert.equal(row.userId,user);row.state='failed';}};
const routePath=new URL('../.sites-runtime/document-route-test.mjs',import.meta.url);
await build({entryPoints:[new URL('../app/api/transcribe/route.ts',import.meta.url).pathname],outfile:routePath.pathname,bundle:true,packages:'external',platform:'node',format:'esm',logLevel:'silent',plugins:[{name:'document-fixtures',setup(b){b.onResolve({filter:/^@\/lib\/(app-auth|archive-store)$/},args=>({path:args.path,namespace:'document-fixture'}));b.onLoad({filter:/.*/,namespace:'document-fixture'},args=>({loader:'js',contents:args.path.endsWith('app-auth')?'export const requireAppUser=async()=>globalThis.__documentFixture.requireUser();export const appErrorResponse=()=>Response.json({error:"signin"},{status:401});':'export const ArchiveError=globalThis.__documentFixture.ArchiveError;export const saveMediaSubmission=(user,input)=>globalThis.__documentFixture.save(user,input);export const saveTranscription=(user,id,text)=>globalThis.__documentFixture.transcript(user,id,text);export const markSubmissionFailed=(user,id)=>globalThis.__documentFixture.failed(user,id);'}));}}]});
const route=await import(routePath.href);
function upload(file){const form=new FormData();form.set('media',file);return route.POST(new Request('https://poetry.invalid/api/transcribe',{method:'POST',body:form}));}
test('text upload saves original bytes before extraction and returns the full source in the owning account',async()=>{
 setRuntimeBindings({});const response=await upload(new File([story],'story.txt',{type:'text/plain'})),data=await response.json();assert.equal(response.status,200);assert.equal(data.text,story);assert.equal(data.original_saved,true);
 const record=records.get(data.submission_id);assert.equal(record.userId,'document-writer-a');assert.equal(record.sourceMode,'document');assert.equal(record.bytes.toString(),story);assert.equal(record.text,story);
 activeUser=null;try{assert.equal((await upload(new File([story],'story.txt'))).status,401);}finally{activeUser={id:'document-writer-a'};}
});
test('a provider quota error preserves the original and returns an honest resumable error',async()=>{
 setRuntimeBindings({OPENAI_API_KEY:'synthetic-document-fixture'});const originalFetch=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({error:{message:'Quota exceeded for synthetic fixture',code:'insufficient_quota',type:'insufficient_quota'}},{status:429});
 try{
  const response=await upload(new File(['%PDF-1.7\nfixture'],'story.pdf',{type:'application/pdf'})),data=await response.json();assert.equal(response.status,429);assert.equal(data.original_saved,true);assert.equal(data.code,'AI_SERVICE_LIMIT');assert.match(data.error,/حصة/);
  const record=records.get(data.submission_id);assert.equal(record.bytes.toString(),'%PDF-1.7\nfixture');assert.equal(record.userId,'document-writer-a');assert.equal(record.state,'failed');assert.equal(record.text,undefined);
 }finally{globalThis.fetch=originalFetch;}
});
test('document controls, complete-source screening and safe downloads are wired to the real app',async()=>{
 const [studio,poetry,safety,download]=await Promise.all(['../components/PoetryStudio.tsx','../app/api/poetry/route.ts','../lib/content-safety.ts','../app/api/audio/[submissionId]/route.ts'].map(path=>readFile(new URL(path,import.meta.url),'utf8')));
 assert.match(studio,/رفع مستند أو صورة أو PDF/);assert.match(studio,/\.pdf,\.docx,\.txt/);assert.match(studio,/maxLength=\{MAX_STORY_CHARACTERS\}/);assert.match(poetry,/max\(MAX_STORY_CHARACTERS\)/);assert.doesNotMatch(safety,/slice\(0,\s*14_000\)/);assert.match(download,/attachment; filename\*/);assert.match(download,/nosniff/);
});
