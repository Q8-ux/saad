import {normalizeRecord,prepareSpec,audienceSignals,category,growthMetrics,platformNames} from '../../lib/radar-core.mjs';
import {normalizeCampaign} from '../../lib/content-core.mjs';

export const transferLimit=10*1024*1024;
const kinds=new Set(['connector','dataset','search','saved','metric','campaign']);
const text=(value,max=300)=>typeof value==='string'?value.slice(0,max):'';
const timestamp=value=>typeof value==='string'&&!Number.isNaN(Date.parse(value))?new Date(value).toISOString():null;
const count=value=>Number.isSafeInteger(value)&&value>=0?value:0;
const invalid=()=>Error('ملف النقل غير صالح. استخدم ملف «نقل الربط والنتائج» من راصد.');

function record(raw){
  if(!raw||typeof raw.id!=='string'||raw.id.length>300||!Object.hasOwn(platformNames,raw.platform)||!['comment','reply','post'].includes(raw.kind||'comment'))throw invalid();
  const row=normalizeRecord(raw,raw.platform,raw.sourceUrl,raw.kind||'comment');
  if(!row||row.id!==raw.id)throw invalid();
  const geo=raw.geo;
  return {...row,intent:audienceSignals(row.text),category:category(row.text),score:Math.max(0,Math.min(100,Number(raw.score)||0)),matchedTerms:Array.isArray(raw.matchedTerms)?raw.matchedTerms.filter(t=>typeof t==='string').slice(0,16).map(t=>t.slice(0,240)):[],...(geo&&['unknown','mentioned','profile','unrestricted'].includes(geo.status)?{geo:{status:geo.status,label:text(geo.label),evidence:text(geo.evidence,600)}}:{})};
}
function report(raw={}){
  return {provider:text(raw.provider),calls:count(raw.calls),creditsUsed:raw.creditsUsed===null?null:count(raw.creditsUsed),coverage:text(raw.coverage,1500),collectedAt:timestamp(raw.collectedAt),truncated:raw.truncated===true,sources:(Array.isArray(raw.sources)?raw.sources:[]).slice(0,6).map(source=>{
    if(!Object.hasOwn(platformNames,source.platform))throw invalid();
    return {platform:source.platform,status:text(source.status,40),records:count(source.records),pages:count(source.pages),remainingCursors:Array.isArray(source.remainingCursors)?source.remainingCursors.slice(0,100).map(cursor=>text(cursor,4000)):[],error:source.error?{code:text(source.error.code,100),message:text(source.error.message,1000)}:null};
  })};
}

export function readTransfer(input,endpoint){
  if(!input||input.format!=='saad-radar-transfer'||input.version!==1||input.backend!==endpoint||!Array.isArray(input.documents)||!input.documents.length||input.documents.length>500)throw invalid();
  if(new TextEncoder().encode(JSON.stringify(input)).byteLength>transferLimit)throw Error('ملف النقل أكبر من ١٠ ميجابايت.');
  const keys=new Set();let totalRecords=0;
  const documents=input.documents.map(doc=>{
    if(!doc||!kinds.has(doc.kind)||!doc.payload||typeof doc.key!=='string'||keys.has(doc.key))throw invalid();
    keys.add(doc.key);const raw=doc.payload;let payload;
    const rows=values=>{if(!Array.isArray(values)||values.length>2000||(totalRecords+=values.length)>20000)throw invalid();return values.map(record);};
    if(doc.kind==='connector'){
      if(doc.key!=='connector:scrapecreators'||typeof raw.credential!=='string'||!/^[A-Za-z0-9_-]{40,1800}$/.test(raw.credential))throw invalid();
      payload={credential:raw.credential,configuredAt:timestamp(raw.configuredAt),verifiedAt:timestamp(raw.verifiedAt)};
    }else{
      if(typeof raw.id!=='string'||!raw.id||raw.id.length>300||doc.key!==doc.kind+':'+raw.id)throw invalid();
      if(doc.kind==='dataset')payload={id:raw.id,name:text(raw.name,100),records:rows(raw.records),createdAt:timestamp(raw.createdAt)};
      if(doc.kind==='saved')payload=record(raw);
      if(doc.kind==='campaign')payload={...normalizeCampaign({...raw,state:'draft'}),provenance:'imported-draft'};
      if(doc.kind==='search'){
        if(!['completed','uncollected'].includes(raw.state))throw invalid();
        const spec=prepareSpec(raw.spec);spec.maxRequests=Math.min(12,spec.maxRequests);spec.maxCredits=Math.min(20,spec.maxCredits);
        const excluded=Object.fromEntries(['duplicate','topic','notRequest','country','date','dateUnknown'].map(key=>[key,count(raw.excluded?.[key])]));
        payload={id:raw.id,state:raw.state,mode:raw.mode==='live'?'live':'library',spec,createdAt:timestamp(raw.createdAt),scanned:count(raw.scanned),results:rows(raw.results),excluded,report:report(raw.report)};
      }
      if(doc.kind==='metric'){
        if(!Object.hasOwn(platformNames,raw.platform)||!text(raw.account)||!/^\d{4}-\d{2}-\d{2}$/.test(raw.start||'')||!/^\d{4}-\d{2}-\d{2}$/.test(raw.end||'')||raw.start>raw.end)throw invalid();
        payload={id:raw.id,account:text(raw.account,150),platform:raw.platform,start:raw.start,end:raw.end,...growthMetrics(raw),createdAt:timestamp(raw.createdAt)};
      }
    }
    return {key:doc.key,kind:doc.kind,payload,updatedAt:timestamp(doc.updatedAt)||new Date().toISOString()};
  });
  return {documents,preferredSearchId:documents.some(d=>d.kind==='search'&&d.payload.id===input.preferredSearchId)?input.preferredSearchId:null};
}

export function makeTransfer(documents,endpoint,preferredSearchId){
  const eligible=documents.filter(doc=>kinds.has(doc.kind));
  const fallback=eligible.filter(doc=>doc.kind==='search').sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).find(doc=>doc.payload.results?.length)?.payload.id;
  const packet={format:'saad-radar-transfer',version:1,backend:endpoint,createdAt:new Date().toISOString(),preferredSearchId:preferredSearchId||fallback||null,documents:eligible};
  const clean=readTransfer(packet,endpoint);
  return {...packet,...clean};
}
