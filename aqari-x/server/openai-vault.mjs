import { generateKeyPairSync, privateDecrypt, constants } from 'node:crypto';
import { seal, unseal } from './security.mjs';

// The deployment's existing vault key protects the RSA private key. Setup can
// import a wrapped provider credential without moving plaintext through tools.
export function createOpenAIVault(query) {
  let cached;
  return {
    async initialize() {
      if (!process.env.VAULT_KEY) return;
      const found=await query("SELECT name FROM office_ai_keys WHERE name='openai'");
      if (found.rows.length) return;
      const pair=generateKeyPairSync('rsa',{modulusLength:4096,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
      await query("INSERT INTO office_ai_keys(name,public_key,private_key) VALUES('openai',$1,$2) ON CONFLICT DO NOTHING",[pair.publicKey,seal({privateKey:pair.privateKey},process.env.VAULT_KEY)]);
    },
    async key() {
      if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
      if (cached && cached.expires>Date.now()) return cached.key;
      const {rows}=await query("SELECT private_key,wrapped_key FROM office_ai_keys WHERE name='openai'");
      if (!rows[0]?.wrapped_key) return null;
      const {privateKey}=unseal(rows[0].private_key,process.env.VAULT_KEY);
      const key=privateDecrypt({key:privateKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(rows[0].wrapped_key,'base64')).toString('utf8');
      if (!/^sk-\S+$/.test(key)) throw new Error('Invalid wrapped provider credential');
      cached={key,expires:Date.now()+60000};return key;
    }
  };
}
