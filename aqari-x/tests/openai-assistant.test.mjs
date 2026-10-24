import test from 'node:test';
import assert from 'node:assert/strict';
import {assembleAssistantResult,issueTicket,verifyTicket,wavFromPCM,transcribeAudio,generateAssistant,normalizeTranscript} from '../server/openai-assistant.mjs';
import {seedProperties} from '../server/seed.mjs';

const plan={kind:'search',reply:'Here are the matching office listings.',newSearch:false,clearFilters:[],selectedPropertyId:null,features:[],filters:{category:'للإيجار',type:'شقة',area:null,minPrice:null,maxPrice:500,bedrooms:3,sort:null}};
test('Urdu transcription is normalized to Urdu script using text only when necessary',async()=>{
 let calls=0;
 const fetcher=async(url,options)=>{calls++;assert.equal(url,'https://api.openai.com/v1/responses');const sent=JSON.parse(options.body);assert.equal(typeof sent.input,'string');assert.equal(sent.store,false);return{ok:true,json:async()=>({output:[{content:[{type:'output_text',text:'مجھے جابریہ میں فلیٹ چاہیے۔'}]}]})};};
 assert.equal(await normalizeTranscript('मुझे जाबरिया में फ्लैट चाहिए।','ur','synthetic',{fetcher}),'مجھے جابریہ میں فلیٹ چاہیے۔');
 assert.equal(await normalizeTranscript('Hello','en','synthetic',{fetcher}),'Hello');assert.equal(calls,1);
});
test('explicit multilingual conditions win over an incomplete model plan',()=>{
 const out=assembleAssistantResult({message:'3 bedroom apartment in Jabriya under 500',locale:'en'},seedProperties,{},plan);
 assert.equal(out.filters.area,'الجابرية');assert.deepEqual(out.properties.map(x=>x.id),['initial-08']);
 assert.ok(!out.message.includes(plan.reply));
});
test('model can clear a dropped condition while preserving the other constraints',()=>{
 const out=assembleAssistantResult({message:'any area please',locale:'en',filters:{area:'الجابرية',type:'شقة',maxPrice:450}},seedProperties,{}, {...plan,filters:{},clearFilters:['area']});
 assert.ok(!out.filters.area);assert.equal(out.filters.maxPrice,450);assert.ok(out.properties.every(p=>p.priceFils!==null&&p.priceFils<=450000));
});
test('private IDs and fabricated price text never become public property facts',()=>{
 const hidden={...seedProperties[0],id:'hidden-id',title:'Private title',status:'pending'};
 const out=assembleAssistantResult({message:'details',locale:'en'},[...seedProperties,hidden],{}, {...plan,kind:'details',selectedPropertyId:'hidden-id',reply:'Only 100 KWD.'});
 assert.ok(!JSON.stringify(out).includes('Private title'));assert.ok(!out.message.includes('100 KWD'));
});
test('speech and anonymous session tickets reject tampering, wrong purpose and expired values',()=>{
 const token=issueTicket({kind:'session',id:'synthetic'},'test-secret');
 assert.equal(verifyTicket(token,'session','test-secret').id,'synthetic');
 assert.equal(verifyTicket(token,'speech','test-secret'),null);assert.equal(verifyTicket(token,'session','wrong'),null);
 assert.equal(verifyTicket(token.slice(0,-1)+'x','session','test-secret'),null);
 assert.equal(verifyTicket(issueTicket({kind:'session'},'test-secret',-1),'session','test-secret'),null);
});
test('generated PCM is wrapped as mono 24 kHz WAV and invalid input cannot call transcription',async()=>{
 const pcm=Buffer.alloc(48000),wav=wavFromPCM(pcm);
 assert.equal(wav.subarray(0,4).toString(),'RIFF');assert.equal(wav.readUInt32LE(24),24000);assert.equal(wav.readUInt32LE(40),pcm.length);assert.equal(wav.length,pcm.length+44);
 let calls=0;await assert.rejects(transcribeAudio(Buffer.alloc(200),'text/html','en','unused',{fetcher:async()=>{calls++;}}));assert.equal(calls,0);
});
test('provider receives only public inventory and structured output is validated before display',async()=>{
 let sent;
 const fetcher=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');sent=JSON.parse(options.body);return{ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify({...plan,filters:{...plan.filters,area:'الجابرية'}})}]}],usage:{input_tokens:2,output_tokens:3}})};};
 const hidden={...seedProperties[0],id:'hidden',status:'pending',title:'Private client information'};
 const out=await generateAssistant({locale:'en',message:'apartment in Jabriya under 500'},[...seedProperties,hidden],{},'synthetic-key',{fetcher});
 assert.equal(sent.store,false);assert.ok(!JSON.stringify(sent).includes('Private client information'));assert.equal(out.method,'openai');assert.deepEqual(out.properties.map(p=>p.id),['initial-08']);
});
