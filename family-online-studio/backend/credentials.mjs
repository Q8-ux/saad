import {randomBytes,scrypt as derive,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';

const scrypt=promisify(derive);
const encoded=/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/;
export const validPasswordHash=value=>typeof value==='string'&&encoded.test(value);
export async function hashPassword(password,salt=randomBytes(16).toString('hex')){
 if(typeof password!=='string'||!password||password.length>160||!/^[a-f0-9]{32}$/.test(salt))throw new TypeError('Invalid password configuration');
 const key=await scrypt(password,salt,64);
 return `scrypt$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password,stored){
 if(typeof password!=='string'||!password||password.length>160||!validPasswordHash(stored))return false;
 const [,salt,key]=stored.split('$');
 const actual=await scrypt(password,salt,64);
 return timingSafeEqual(actual,Buffer.from(key,'hex'));
}
