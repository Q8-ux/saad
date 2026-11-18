import {listStoredAttachments,downloadStoredOriginal,readStoredText,recoverStoredAttachments} from './studio-file-store.mjs?v=20261118-recovery1';
/** @param {any} React */
export function createSavedAttachmentsView(React){
 const h=React.createElement;
 /** @param {any} props */
 return function SavedAttachments({request,onUse,onRetry,disabled=false}){
  const [open,setOpen]=React.useState(false),[files,setFiles]=React.useState([]),[query,setQuery]=React.useState(''),[cursor,setCursor]=React.useState(null),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
  const [recovering,setRecovering]=React.useState(false),[recovery,setRecovery]=React.useState(null),[recoveryError,setRecoveryError]=React.useState('');
  const mounted=React.useRef(true),abort=React.useRef(null),recoveryAbort=React.useRef(null),opened=React.useRef(false);
  const requestRef=React.useRef(request);requestRef.current=request;
  const queryRef=React.useRef(query);queryRef.current=query;
  const currentRequest=React.useCallback((...args)=>requestRef.current(...args),[]);
  async function load(next=0){abort.current?.abort();const ctrl=new AbortController;abort.current=ctrl;setBusy(true);setError('');try{const result=await listStoredAttachments(currentRequest,{query:queryRef.current,cursor:next,signal:ctrl.signal});if(!mounted.current||ctrl.signal.aborted)return;setFiles(old=>next?[...old,...result.files.filter(f=>!old.some(x=>x.id===f.id))]:result.files);setCursor(result.nextCursor);}catch(e){if(mounted.current&&!ctrl.signal.aborted)setError(e.message||'تعذر فتح الأرشيف.');}finally{if(mounted.current&&!ctrl.signal.aborted)setBusy(false);}}
  async function restore(restart=false){recoveryAbort.current?.abort();const ctrl=new AbortController;recoveryAbort.current=ctrl;setRecovering(true);setRecoveryError('');try{const result=await recoverStoredAttachments(currentRequest,{restart,signal:ctrl.signal,onProgress:value=>{if(mounted.current&&!ctrl.signal.aborted)setRecovery(value);}});if(mounted.current&&!ctrl.signal.aborted){setRecovery(result);if(opened.current)void load();}}catch(e){if(mounted.current&&!ctrl.signal.aborted)setRecoveryError(e.message||'تعذر إكمال استعادة النصوص القديمة.');}finally{if(mounted.current&&!ctrl.signal.aborted)setRecovering(false);}}
  // Start on the authenticated page, including while the archive is collapsed.
  React.useEffect(()=>{mounted.current=true;void restore();return()=>{mounted.current=false;abort.current?.abort();recoveryAbort.current?.abort();};},[]);
  React.useEffect(()=>{if(open)void load();const refresh=()=>{if(open)void load();};globalThis.addEventListener?.('studio-attachment-saved',refresh);return()=>globalThis.removeEventListener?.('studio-attachment-saved',refresh);},[open]);
  async function act(item,kind){setBusy(true);setError('');try{if(kind==='download')await downloadStoredOriginal(item,request);else if(item.textState==='ready')await onUse(await readStoredText(item,request));else if(onRetry)await onRetry(item);}catch(e){if(mounted.current)setError(e.message||'لم تكتمل العملية.');}finally{if(mounted.current)setBusy(false);}}
  return h('details',{className:'studio-attachment-archive',onToggle:e=>{opened.current=e.currentTarget.open;setOpen(e.currentTarget.open);}},h('summary',null,'📁 ملفاتي المرفوعة',recovering?' · استعادة النصوص القديمة…':''),open&&h('div',null,
   h('p',{className:'archive-scope'},'الملفات الأصلية والنصوص المحفوظة في حسابك'),
   recovering&&h('p',{role:'status'},`جارٍ استعادة النصوص القديمة والإصدارات المحفوظة… ${recovery?.scanned||0}`),
   recovery?.done&&h('p',{className:'archive-scope'},`اكتملت مراجعة النصوص القديمة · ${recovery.recovered} نسخة مستعادة${recovery.warnings?' · تعذرت قراءة '+recovery.warnings+' نسخة قديمة':''}`),
   recoveryError&&h('p',{role:'alert',className:'error-text'},recoveryError),
   h('button',{type:'button',className:'button',disabled:recovering||busy,onClick:()=>void restore(!!recovery?.done)},recovery?.done?'إعادة فحص النصوص القديمة':'استكمال استعادة النصوص القديمة'),
   h('div',{className:'archive-search'},h('input',{type:'search',value:query,'aria-label':'بحث في ملفاتي المرفوعة',placeholder:'ابحث باسم الملف',disabled:busy,onChange:e=>setQuery(e.target.value),onKeyDown:e=>{if(e.key==='Enter'){e.preventDefault();void load();}}}),h('button',{type:'button',className:'button',disabled:busy,onClick:()=>void load()},'بحث')),
   error&&h('p',{role:'alert',className:'error-text'},error),busy&&h('p',{role:'status'},'جارٍ فتح الملف…'),!busy&&!files.length&&h('p',null,'لا توجد مرفقات محفوظة بهذا الاسم.'),
   h('ul',null,files.map(item=>h('li',{key:item.id},h('strong',{dir:'auto'},item.name),h('small',null,`${item.originalSaved?'الأصل محفوظ':'نص مستعاد من '+(item.provenance?.kind==='stored-version'?'إصدار سابق':item.provenance?.kind==='stored-source'?'مصدر محفوظ':'المخطوط المحفوظ')} · ${Math.ceil(item.size/1024)} كيلوبايت · ${item.textState==='ready'?'النص محفوظ':'لم يكتمل التحليل'}${item.provenance?.sourceAt?' · تاريخ المصدر '+new Date(item.provenance.sourceAt).toLocaleString('ar-KW'):item.createdAt?' · '+new Date(item.createdAt).toLocaleString('ar-KW'):''}`),h('div',null,
    h('button',{type:'button',className:'button',disabled:busy,onClick:()=>void act(item,'download')},item.originalSaved?'تنزيل الأصل':'تنزيل النسخة المستعادة'),
    onUse&&h('button',{type:'button',className:'button',disabled:busy||disabled||item.textState!=='ready'&&!onRetry,onClick:()=>void act(item,'use')},item.textState==='ready'?'استخدام النص':'إعادة التحليل'))))),
   cursor!==null&&h('button',{type:'button',className:'button',disabled:busy,onClick:()=>void load(cursor)},'عرض المزيد')));
 };
}
