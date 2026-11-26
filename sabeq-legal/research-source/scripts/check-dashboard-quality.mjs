import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';

export const dashboardChecks=[
 {id:'memo-submission-recovery',files:['tests/memo-submission.test.mjs','tests/interface-language.test.mjs','tests/memo-substance-quality.test.mjs']},
 {id:'case-context',files:['tests/project-context.test.mjs','tests/dashboard-quality.test.mjs']},
 {id:'memo-article-text',files:['tests/article-text-in-memos.test.mjs','tests/memo-completeness.test.mjs','tests/reference-pleading-style.test.mjs','tests/legal-drafting-routes.test.mjs','tests/agent-pipeline.test.mjs']},
 {id:'admin-permissions-and-failures',files:['tests/management.test.mjs','tests/email-worker-transport.test.mjs','tests/gmail.test.mjs']},
 {id:'admin-service-contract',files:['tests/admin-bridge-contract.test.mjs','tests/management-source-connection.test.mjs','tests/admin-source-status.test.mjs','tests/admin-memo-link.test.mjs','tests/ready-forms.test.mjs']},
 {id:'programmer-client',files:['tests/programmer-client.test.mjs']},
];
export function runDashboardChecks(execute=spawnSync,cwd=path.resolve(fileURLToPath(new URL('..',import.meta.url))),exists=existsSync){
 const head=execute('git',['rev-parse','HEAD'],{cwd,encoding:'utf8',timeout:5000});
 const revision=head.status===0&&/^[a-f0-9]{40,64}$/.test((head.stdout||'').trim())?head.stdout.trim():null;
 const changes=execute('git',['status','--porcelain'],{cwd,encoding:'utf8',timeout:5000});
 const results=[];let failed=false;
 for(const check of dashboardChecks){
  if(failed){results.push({id:check.id,status:'not_run',files:check.files});continue;}
  const missingFiles=check.files.filter(file=>!exists(path.resolve(cwd,file)));
  if(missingFiles.length){results.push({id:check.id,status:'failed',files:check.files,missingFiles});failed=true;continue;}
  const result=execute(process.execPath,['--test',...check.files],{cwd,stdio:'inherit',timeout:check.id==='admin-permissions-and-failures'?360000:180000,shell:false});
  const passed=result.status===0&&!result.signal&&!result.error;
  results.push({id:check.id,status:passed?'passed':'failed',files:check.files});failed=!passed;
 }
 return {revision:'dashboard-quality-1',sourceCommit:revision,workingTreeChanged:changes.status===0?!!changes.stdout.trim():null,
  status:failed?'failed':'passed',checks:results,liveBrowserTest:'not_run',liveProviderTest:'not_run',deployed:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const report=runDashboardChecks();console.log(JSON.stringify(report));process.exitCode=report.status==='passed'?0:1;}
