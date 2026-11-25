// Use the uploader's receipt; name-based artifact discovery is ambiguous on reruns.
module.exports = async function deployPages({github,context,core,artifactId,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}) {
  if (!/^[1-9]\d*$/.test(String(artifactId))) throw Error('Missing Pages upload receipt');
  const scope={owner:context.repo.owner,repo:context.repo.repo};
  const {data:artifact}=await github.rest.actions.getArtifact({...scope,artifact_id:Number(artifactId)});
  if (String(artifact.id)!==String(artifactId)||artifact.name!=='github-pages'||artifact.expired||artifact.workflow_run?.id!==context.runId||artifact.workflow_run?.head_sha!==context.sha) throw Error('Pages artifact does not belong to this workflow and commit');
  const token=await core.getIDToken();core.setSecret(token);
  const {data:deployment}=await github.request('POST /repos/{owner}/{repo}/pages/deployments',{...scope,artifact_id:artifactId,pages_build_version:context.sha,oidc_token:token});
  const deploymentId=String(deployment.id||deployment.status_url?.split('/').pop()||'');
  if (!/^[A-Za-z0-9_-]+$/.test(deploymentId)) throw Error('Missing Pages deployment receipt');
  const path={...scope,deploymentId};let failures=0;
  for(let i=0;i<120;i++) {
    await pause(5000);
    let status;
    try {status=(await github.request('GET /repos/{owner}/{repo}/pages/deployments/{deploymentId}',path)).data.status;failures=0;}
    catch(error){failures++;if(failures<3&&(!error.status||error.status>=500))continue;throw Error('Pages status could not be verified');}
    if(status==='succeed'){core.setOutput('page_url',deployment.html_url);core.setOutput('status','succeed');return;}
    if(['deployment_failed','deployment_perms_error','deployment_content_failed','deployment_cancelled','deployment_lost'].includes(status))throw Error('Pages publication ended: '+status);
  }
  await github.request('POST /repos/{owner}/{repo}/pages/deployments/{deploymentId}/cancel',path);
  throw Error('Pages publication timed out and was cancelled');
};
