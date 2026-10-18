import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {Buffer} from 'node:buffer';
export class ApiError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}
export function credentialVault(secret,now=Date.now){
  const key=Buffer.from(secret||'','base64url');
  if(key.length!==32)throw Error('RADAR_SEAL_KEY must contain 32 random base64url bytes');
  return {
    seal(apiKey){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from('radar-provider-v1'));const data=Buffer.concat([cipher.update(JSON.stringify({apiKey,expires:now()+365*86400000}),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url');},
    open(value){try{if(typeof value!=='string'||value.length>1800)throw Error();const data=Buffer.from(value,'base64url');if(data.length<40)throw Error();const decipher=createDecipheriv('aes-256-gcm',key,data.subarray(0,12));decipher.setAAD(Buffer.from('radar-provider-v1'));decipher.setAuthTag(data.subarray(12,28));const result=JSON.parse(Buffer.concat([decipher.update(data.subarray(28)),decipher.final()]).toString('utf8'));if(result.expires<now()||typeof result.apiKey!=='string')throw Error();return result.apiKey;}catch{throw new ApiError(401,'CREDENTIAL_INVALID','أعد حفظ مفتاح المصدر من «مصادر البيانات».');}}
  };
}

