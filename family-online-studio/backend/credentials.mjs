import {randomBytes,scrypt as derive,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';

const scrypt=promisify(derive);
const encoded=/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/;
export const validPasswordHash=value=>typeof value==='string'&&encoded.test(value);
// Usernames are case-insensitive and an optional dot is only a visual separator.
// The stored username remains unchanged for display and account ownership.
export const usernameKey=value=>typeof value==='string'&&value.length<=80?value.trim().toLowerCase().replaceAll('.',''):'';

export function loadAccounts(env){
 if(env.STUDIO_ACCOUNTS_JSON===undefined){
  const {STUDIO_USERNAME:username,STUDIO_PASSWORD_HASH:passwordHash}=env;
  return usernameKey(username)&&validPasswordHash(passwordHash)?[{id:'owner',username,passwordHash}]:[];
 }
 let records;
 try{records=JSON.parse(env.STUDIO_ACCOUNTS_JSON);}catch{return [];}
 if(!Array.isArray(records)||!records.length||records.length>100)return [];
 const ids=new Set(),names=new Set();
 for(const record of records){
  const {id,username,passwordHash}=record??{};
  const name=usernameKey(username);
  if(typeof id!=='string'||!/^[a-z0-9][a-z0-9-]{0,31}$/u.test(id)||!name||ids.has(id)||names.has(name)||!validPasswordHash(passwordHash))return [];
  ids.add(id);names.add(name);
 }
 return records;
}
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
