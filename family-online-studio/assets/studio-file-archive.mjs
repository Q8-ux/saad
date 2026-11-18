import {listStoredAttachments,downloadStoredOriginal,readStoredText} from './studio-file-store.mjs?v=20261118-files1';
/** @param {any} React */
export function createSavedAttachmentsView(React){
 const h=React.createElement;
 /** @param {any} props */
 return function SavedAttachments({request,onUse,onRetry,disabled=false}){
  const [open,setOpen]=React.useState(false),[files,setFiles]=React.useState([]),[query,setQuery]=React.useState(''),[cursor,setCursor]=React.useState(null),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
  const mounted=React.useRef(true),abort=React.useRef(null);
  async function load(next=0){abort.current?.abort();const ctrl=new AbortController;abort.current=ctrl;setBusy(true);setError('');try{const result=await listStoredAttachments(request,{query,cursor:next,signal:ctrl.signal});if(!mounted.current||ctrl.signal.aborted)return;setFiles(old=>next?[...old,...result.files.filter(f=>!old.some(x=>x.id===f.id))]:result.files);setCursor(result.nextCursor);}catch(e){if(mounted.current&&!ctrl.signal.aborted)setError(e.message||'تعذر فتح الأرشيف.');}finally{if(mounted.current&&!ctrl.signal.aborted)setBusy(false);}}
  React.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;abort.current?.abort();};},[]);
  React.useEffect(()=>{if(open)void load();const refresh=()=>{if(open)void load();};globalThis.addEventListener?.('studio-attachment-saved',refresh);return()=>globalThis.removeEventListener?.('studio-attachment-saved',refresh);},[open]);
  async function act(item,kind){setBusy(true);setError('');try{if(kind==='download')await downloadStoredOriginal(item,request);else if(item.textState==='ready')await onUse(await readStoredText(item,request));else if(onRetry)await onRetry(item);}catch(e){if(mounted.current)setError(e.message||'لم تكتمل العملية.');}finally{if(mounted.current)setBusy(false);}}
  return h('details',{className:'studio-attachment-archive',onToggle:e=>setOpen(e.currentTarget.open)},h('summary',null,'📁 ملفاتي المرفوعة'),open&&h('div',null,
   h('p',{className:'archive-scope'},'الملفات الأصلية والنصوص المحفوظة في حسابك'),
   h('div',{className:'archive-search'},h('input',{type:'search',value:query,'aria-label':'بحث في ملفاتي المرفوعة',placeholder:'ابحث باسم الملف',disabled:busy,onChange:e=>setQuery(e.target.value),onKeyDown:e=>{if(e.key==='Enter'){e.preventDefault();void load();}}}),h('button',{type:'button',className:'button',disabled:busy,onClick:()=>void load()},'بحث')),
   error&&h('p',{role:'alert',className:'error-text'},error),busy&&h('p',{role:'status'},'جارٍ فتح الملف…'),!busy&&!files.length&&h('p',null,'لا توجد مرفقات محفوظة بهذا الاسم.'),
   h('ul',null,files.map(item=>h('li',{key:item.id},h('strong',{dir:'auto'},item.name),h('small',null,`الأصل محفوظ · ${Math.ceil(item.size/1024)} كيلوبايت · ${item.textState==='ready'?'النص محفوظ':'لم يكتمل التحليل'}${item.createdAt?' · '+new Date(item.createdAt).toLocaleString('ar-KW'):''}`),h('div',null,
    h('button',{type:'button',className:'button',disabled:busy,onClick:()=>void act(item,'download')},'تنزيل الأصل'),
    onUse&&h('button',{type:'button',className:'button',disabled:busy||disabled||item.textState!=='ready'&&!onRetry,onClick:()=>void act(item,'use')},item.textState==='ready'?'استخدام النص':'إعادة التحليل'))))),
   cursor!==null&&h('button',{type:'button',className:'button',disabled:busy,onClick:()=>void load(cursor)},'عرض المزيد')));
 };
}
