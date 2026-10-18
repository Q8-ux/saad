import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {Buffer} from 'node:buffer';
export function jobVault(secret,now=Date.now){
  const key=Buffer.from(secret||'','base64url'),aad=Buffer.from('radar-tools-job-v1');
  if(key.length!==32)throw Error('Invalid job encryption key');
  return {
    seal(value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(aad);const data=Buffer.concat([cipher.update(JSON.stringify({value,expires:now()+3600000}),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url');},
    open(value){try{if(typeof value!=='string'||value.length>400000)throw Error();const data=Buffer.from(value,'base64url');if(data.length<40)throw Error();const cipher=createDecipheriv('aes-256-gcm',key,data.subarray(0,12));cipher.setAAD(aad);cipher.setAuthTag(data.subarray(12,28));const result=JSON.parse(Buffer.concat([cipher.update(data.subarray(28)),cipher.final()]).toString('utf8'));if(result.expires<=now()||typeof result.value!=='string')throw Error();return result.value;}catch{throw Object.assign(Error('انتهت صلاحية المهمة أو تعذر التحقق منها.'),{status:410});}}
  };
}
