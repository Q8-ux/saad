import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createGateway,readConfig,validateJob} from '../backend/server.mjs';
test('Gateway enforces auth/origin, avoids duplicate processing, and routes research with correct contract',async t=>{
 const calls=[];const mock=http.createServer(async(req,res)=>{const chunks=[];for await(const b of req)chunks.push(b);calls.push({path:req.url,auth:req.headers.authorization,data:chunks.length?JSON.parse(Buffer.concat(chunks)):null});res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({status:'ok',summary:'Example research result',sources:[]}));});mock.listen(0,'127.0.0.1');await once(mock,'listening');t.after(()=>mock.close());
 const config=readConfig({STUDIO_ACCESS_TOKEN:'test-token-that-is-at-least-24-chars',ALLOWED_ORIGINS:'https://q8-ux.github.io',MASAR_API_URL:`http://127.0.0.1:${mock.address().port}`,MASAR_API_KEY:'upstream-test-key'});const app=createGateway(config);app.listen(0,'127.0.0.1');await once(app,'listening');t.after(()=>app.close());const url=`http://127.0.0.1:${app.address().port}`;
 assert.equal((await fetch(url+'/v1/capabilities')).status,401);assert.equal((await fetch(url+'/health',{headers:{Origin:'https://unapproved.test'}})).status,403);
 const headers={Authorization:`Bearer ${config.token}`,'Content-Type':'application/json',Origin:'https://q8-ux.github.io','Idempotency-Key':'qa-request-1'};const job={route:'research',language:'ar',text:'فكرة للفيديو',urls:['https://example.com/source']};
 const r=await fetch(url+'/v1/run',{method:'POST',headers,body:JSON.stringify(job)});assert.equal(r.status,200);assert.equal((await r.json()).result.summary,'Example research result');assert.equal(calls[0].path,'/v1/analyze');assert.equal(calls[0].auth,'Bearer upstream-test-key');assert.equal(calls[0].data.query,'فكرة للفيديو');assert.equal(calls[0].data.use_llm,false);
 assert.equal((await fetch(url+'/v1/run',{method:'POST',headers,body:JSON.stringify(job)})).status,200);assert.equal(calls.length,1);
 assert.equal((await fetch(url+'/v1/run',{method:'POST',headers,body:JSON.stringify({...job,text:'different'})})).status,409);
 const m=await fetch(url+'/v1/run',{method:'POST',headers:{...headers,'Idempotency-Key':'qa-marketing'},body:JSON.stringify({route:'marketing',language:'en',text:'clip',urls:[],existing_clips:1,source_url:'https://example.com/video'})});assert.equal(m.status,409);assert.equal(calls.length,1);
});
test('Gateway rejects unapproved routes and private media destinations',()=>{assert.throws(()=>validateJob({route:'shell',language:'ar',text:'test'}));assert.throws(()=>validateJob({route:'research',language:'ar',text:'test',urls:['https://127.0.0.1/private']}));assert.throws(()=>validateJob({route:'research',language:'ar',text:'test',urls:['file:///etc/passwd']}));});
