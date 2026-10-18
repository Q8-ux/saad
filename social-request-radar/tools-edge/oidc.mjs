const issuer='https://token.actions.githubusercontent.com';
const audience='social-request-radar-tools';
const workflow='q8-ux/saad/.github/workflows/radar-tools-worker.yml@refs/heads/main';
const decode=part=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(part.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));
const bytes=part=>Uint8Array.from(atob(part.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export function githubVerifier({fetcher=fetch,now=Date.now}={}){
  let cached,expires=0;
  return async function verify(token){
    try{
      if(typeof token!=='string'||token.length>16000)throw Error();
      const parts=token.split('.');if(parts.length!==3)throw Error();
      const header=decode(parts[0]),claims=decode(parts[1]),time=now()/1000;
      if(header.alg!=='RS256'||!header.kid||claims.iss!==issuer||claims.aud!==audience||claims.repository_id!=='1296995243'||claims.repository_owner_id!=='289591300'||claims.repository?.toLowerCase()!=='q8-ux/saad'||claims.workflow_ref?.toLowerCase()!==workflow||claims.ref!=='refs/heads/main'||!['push','workflow_dispatch'].includes(claims.event_name)||!/^\d+$/.test(claims.run_id)||!Number.isFinite(claims.exp)||!Number.isFinite(claims.nbf)||!Number.isFinite(claims.iat)||claims.exp<=time||claims.nbf>time+30||claims.iat>time+30||claims.exp-claims.iat>1800)throw Error();
      if(!cached||now()>expires){const response=await fetcher(issuer+'/.well-known/jwks',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error();cached=(await response.json()).keys;expires=now()+300000;}
      const jwk=cached.find(key=>key.kid===header.kid&&key.kty==='RSA');if(!jwk)throw Error();
      const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
      if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw Error();
      return {runId:claims.run_id,sha:claims.sha};
    }catch{const error=new Error('هوية عامل المعالجة غير صالحة.');error.status=401;throw error;}
  };
}
