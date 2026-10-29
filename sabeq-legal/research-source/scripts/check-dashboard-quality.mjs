import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';

export const dashboardChecks=[
 {id:'case-context',files:['tests/project-context.test.mjs','tests/dashboard-quality.test.mjs']},
 {id:'admin-permissions-and-failures',files:['tests/management.test.mjs']},
 {id:'admin-service-contract',files:['tests/admin-bridge-contract.test.mjs','tests/management-source-connection.test.mjs','tests/admin-source-status.test.mjs']},
 {id:'programmer-client',files:['tests/programmer-client.test.mjs']},
];
export function runDashboardChecks(execute=spawnSync,cwd=path.resolve(fileURLToPath(new URL('..',import.meta.url)))){
 const head=execute('git',['rev-parse','HEAD'],{cwd,encoding:'utf8',timeout:5000});
 const revision=head.status===0&&/^[a-f0-9]{40,64}$/.test((head.stdout||'').trim())?head.stdout.trim():null;
 const changes=execute('git',['status','--porcelain'],{cwd,encoding:'utf8',timeout:5000});
 const results=[];let failed=false;
 for(const check of dashboardChecks){
  if(failed){results.push({id:check.id,status:'not_run',files:check.files});continue;}
  const result=execute(process.execPath,['--test',...check.files],{cwd,stdio:'inherit',timeout:180000,shell:false});
  const passed=result.status===0&&!result.signal&&!result.error;
  results.push({id:check.id,status:passed?'passed':'failed',files:check.files});failed=!passed;
 }
 return {revision:'dashboard-quality-1',sourceCommit:revision,workingTreeChanged:changes.status===0?!!changes.stdout.trim():null,
  status:failed?'failed':'passed',checks:results,liveBrowserTest:'not_run',liveProviderTest:'not_run',deployed:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const report=runDashboardChecks();console.log(JSON.stringify(report));process.exitCode=report.status==='passed'?0:1;}
