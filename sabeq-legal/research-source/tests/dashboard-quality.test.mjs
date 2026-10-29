import test from 'node:test';
import assert from 'node:assert/strict';
import {runDashboardChecks,dashboardChecks} from '../scripts/check-dashboard-quality.mjs';
test('dashboard checks use real test entrypoints, fixed argv and a source revision without claiming a live test',()=>{
 const calls=[];const report=runDashboardChecks((command,args,options)=>{calls.push({command,args,options});if(command==='git')return {status:0,stdout:args[0]==='rev-parse'?'a'.repeat(40)+'\n':''};assert.equal(options.shell,false);assert.deepEqual(args.slice(0,1),['--test']);return {status:0};});
 assert.equal(report.status,'passed');assert.equal(report.sourceCommit,'a'.repeat(40));
 assert.equal(report.workingTreeChanged,false);assert.equal(report.liveBrowserTest,'not_run');assert.equal(report.liveProviderTest,'not_run');assert.equal(report.deployed,false);
 assert.equal(calls.filter(x=>x.command!=='git').length,dashboardChecks.length);
});
test('a failing, timed-out or unstarted check cannot turn into success and later checks remain unexecuted',()=>{
 for(const failure of [{status:1},{status:null,signal:'SIGTERM'},{status:null,error:new Error('synthetic spawn failure')}]){
  let executions=0;const report=runDashboardChecks((command)=>{if(command==='git')return {status:1,stdout:''};executions++;return failure;});
  assert.equal(executions,1);assert.equal(report.status,'failed');assert.equal(report.sourceCommit,null);
  assert.equal(report.checks[0].status,'failed');assert.ok(report.checks.slice(1).every(x=>x.status==='not_run'));
 }
});
