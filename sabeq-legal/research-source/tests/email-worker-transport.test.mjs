import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';

const root=fileURLToPath(new URL('..',import.meta.url));
const key='re_synthetic_worker_fixture_only';
const mail={address:'inbox@example.test',apiKey:key,signingSecret:''};
// Isolate persistence/configuration only; both production transports run in real workerd.
const fixtures={
 '@/lib/verification-email-settings':`export async function verificationEmailDelivery(){return {fromEmail:'sender@example.test',apiKey:${JSON.stringify(key)}};}`,
 '@/db':`export function getD1(){return {prepare(){return {bind(){return this},async first(){return {sealed:${JSON.stringify(JSON.stringify(mail))}}},async run(){return {success:true}}}}}}`,
 '@/lib/management-auth':`export const openConfig=JSON.parse,sealConfig=async value=>JSON.stringify(value),digest=async()=>'',equalSignature=()=>false,signIntegration=async()=>'';`,
 '@/lib/request-security':`export class RequestError extends Error {constructor(message,status=400){super(message);this.status=status}};export const cleanEmail=value=>value,cleanString=value=>value;`,
};
const bundle=await build({
 stdin:{resolveDir:root,contents:`
  import {sendVerificationCode} from './lib/email.ts';
  import {mailAction} from './lib/management-integrations.ts';
  export default {async fetch(request){try{
   if(new URL(request.url).pathname==='/send')await sendVerificationCode({to:'recipient@example.test',name:'اختبار اصطناعي',code:'123456',language:'ar'});
   else await mailAction({action:'test'},'synthetic-actor');
   return Response.json({ok:true});
  }catch(error){return Response.json({ok:false,kind:error.kind||'delivery'},{status:502});}}};`,loader:'ts'},
 bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',
 plugins:[{name:'synthetic-boundaries',setup(builder){
  builder.onResolve({filter:/^@\//},args=>({path:args.path,namespace:'fixture'}));
  builder.onLoad({filter:/.*/,namespace:'fixture'},args=>{
   if(!fixtures[args.path])throw Error('Unisolated fixture boundary: '+args.path);
   return {contents:fixtures[args.path],loader:'js'};
  });
 }}],
});

for(const path of ['/send','/inbound']){
 for(const redirected of [false,true]){
  test(`workerd ${path} ${redirected?'rejects redirects without forwarding credentials':'reaches Resend successfully'}`,async()=>{
   const calls=[];
   const worker=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',
    outboundService:async request=>{
     calls.push({url:request.url,method:request.method,authorization:request.headers.get('Authorization')});
     if(redirected)return new Response(null,{status:302,headers:{Location:'https://untrusted.example.test/capture'}});
     return Response.json(path==='/send'?{id:'synthetic-delivery-id'}:{data:[]});
    },
   });
   try{
    const response=await worker.dispatchFetch('https://fixture.example.test'+path);
    assert.equal(response.status,redirected?502:200);
    assert.equal(calls.length,1,'The provider must be reached once, without following redirects');
    assert.equal(calls[0].url,path==='/send'?'https://api.resend.com/emails':'https://api.resend.com/emails/receiving?limit=1');
    assert.equal(calls[0].method,path==='/send'?'POST':'GET');
    assert.equal(calls[0].authorization,'Bearer '+key);
    assert.ok(!(await response.text()).includes(key));
   }finally{await worker.dispose();}
  });
 }
}
