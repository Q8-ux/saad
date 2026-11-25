import test from 'node:test';
import assert from 'node:assert/strict';
import deployPages from '../deployment/deploy-pages.cjs';
function harness(statuses=['deployment_in_progress','succeed']){
 const calls=[],outputs={},context={repo:{owner:'fixture',repo:'repository'},runId:42,sha:'a'.repeat(40)};
 const artifact={id:987,name:'github-pages',expired:false,workflow_run:{id:42,head_sha:context.sha}};
 const github={rest:{actions:{getArtifact:async data=>{calls.push(['read',data]);return {data:artifact};}}},request:async(path,data)=>{calls.push([path,data]);if(path.startsWith('POST')&&!path.endsWith('/cancel'))return {data:{id:'deployment-1',html_url:'https://fixture.github.io/repository/'}};return {data:{status:statuses.length>1?statuses.shift():statuses[0]}};}};
 const core={getIDToken:async()=>{calls.push(['oidc']);return 'synthetic-oidc-only';},setSecret(){},setOutput:(key,value)=>outputs[key]=value};
 return {args:{github,context,core,artifactId:'987',pause:async()=>{}},calls,outputs,artifact};
}
test('publish uses the exact uploader ID and verifies its run and commit without any name-based list',async()=>{
 const h=harness();await deployPages(h.args);assert.equal(h.outputs.status,'succeed');assert.equal(h.outputs.page_url,'https://fixture.github.io/repository/');
 const create=h.calls.find(([path])=>path==='POST /repos/{owner}/{repo}/pages/deployments');assert.equal(create[1].artifact_id,'987');assert.equal(create[1].pages_build_version,h.args.context.sha);assert.equal(create[1].oidc_token,'synthetic-oidc-only');assert.ok(!h.calls.some(([path])=>/list/i.test(path)));
});
test('foreign, expired or missing artifacts cannot create a Pages deployment',async()=>{
 for(const mutate of [h=>h.args.artifactId='',h=>h.artifact.workflow_run.id=99,h=>h.artifact.workflow_run.head_sha='b'.repeat(40),h=>h.artifact.expired=true]){
  const h=harness();mutate(h);await assert.rejects(deployPages(h.args));assert.ok(!h.calls.some(([path])=>path==='oidc'||path.startsWith('POST')));
 }
});
test('terminal failure never reports success and a pending deployment is cancelled at its bound',async()=>{
 const failed=harness(['deployment_content_failed']);await assert.rejects(deployPages(failed.args),/deployment_content_failed/);assert.equal(failed.outputs.status,undefined);
 const pending=harness(['deployment_in_progress']);await assert.rejects(deployPages(pending.args),/timed out/);assert.ok(pending.calls.some(([path])=>path.endsWith('/cancel')));assert.equal(pending.calls.filter(([path])=>path.startsWith('GET ')).length,120);
});
