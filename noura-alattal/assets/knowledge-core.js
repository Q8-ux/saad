"use strict";
(function(root){
  const normalize=value=>String(value||"").normalize("NFKC").toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g,"").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim();
  function createEngine(data){
    const entries=[...data.guides.map(g=>({...g,key:"guide:"+g.id,kind:"guide",url:"guide/"+g.id})),...data.works.map(w=>({...w,key:"work:"+w.id,kind:"work",url:"work/"+w.id,summary:w.focus})),...data.terms.map(t=>({...t,key:"term:"+t.id,kind:"term",url:"guide/"+t.guide,summary:t.text})),...data.templates.map(t=>({...t,key:"template:"+t.id,kind:"template",url:"template/"+t.id,summary:t.intro}))];
    const known=new Set(entries.map(e=>e.key));
    const learning=typeof module!=="undefined"&&module.exports?require("./learning-core.js"):root.NOURA_LEARNING_CORE;
    const discovery=learning.createSearch(data,entries);
    return {entries,find:key=>entries.find(e=>e.key===key),search:discovery.search,related:discovery.related,concepts:discovery.concepts,createStore(storage){
      const KEY="noura-reference-v1",empty=()=>({version:1,bookmarks:[],read:[],notes:{},templates:{}});let state=empty(),loadError=false;
      const clean=input=>{if(!input||input.version!==1||!Array.isArray(input.bookmarks)||!Array.isArray(input.read)||!input.notes||typeof input.notes!=="object"||!input.templates||typeof input.templates!=="object")throw Error("صيغة دفتر البحث غير صالحة.");const s=empty();s.bookmarks=[...new Set(input.bookmarks.filter(k=>known.has(k)))];s.read=[...new Set(input.read.filter(k=>known.has(k)))];for(const [k,v]of Object.entries(input.notes)){if(known.has(k)&&v&&typeof v.text==="string")s.notes[k]={text:v.text.slice(0,12000),date:typeof v.date==="string"?v.date:""};}for(const t of data.templates){if(input.templates[t.id]){s.templates[t.id]={};for(const [name]of t.fields)s.templates[t.id][name]=String(input.templates[t.id][name]||"").slice(0,4000);}}return s;};
      try{const p=storage.getItem(KEY);if(p)state=clean(JSON.parse(p));}catch{loadError=true;}
      const commit=fn=>{const next=JSON.parse(JSON.stringify(state));fn(next);storage.setItem(KEY,JSON.stringify(next));state=next;};
      const valid=k=>{if(!known.has(k))throw Error("المادة المرجعية غير موجودة.");};
      return {get state(){return JSON.parse(JSON.stringify(state));},loadError,toggle(key,field="bookmarks"){valid(key);if(!["bookmarks","read"].includes(field))throw Error("خيار غير صالح.");commit(s=>{s[field]=s[field].includes(key)?s[field].filter(k=>k!==key):[...s[field],key];});},note(key,text){valid(key);if(String(text).length>12000)throw Error("الملاحظة أطول من الحد المتاح.");commit(s=>{if(String(text).trim())s.notes[key]={text:String(text),date:new Date().toISOString()};else delete s.notes[key];});},template(id,values){const t=data.templates.find(t=>t.id===id);if(!t)throw Error("القالب غير موجود.");commit(s=>{s.templates[id]={};for(const [key]of t.fields)s.templates[id][key]=String(values[key]||"").slice(0,4000);});},import(input){const incoming=clean(input);commit(s=>{s.bookmarks=[...new Set([...s.bookmarks,...incoming.bookmarks])];s.read=[...new Set([...s.read,...incoming.read])];s.notes={...s.notes,...incoming.notes};s.templates={...s.templates,...incoming.templates};});}};
    }};
  }
  const api={normalize,createEngine};if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.NOURA_REFERENCE_CORE=api;
})(typeof window!=="undefined"?window:globalThis);
