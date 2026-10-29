import { env } from "cloudflare:workers";
import { getD1 } from "@/db";

type AdminEnvironment = { ADMIN_SERVICE_TOKEN?: string };

function secureEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function hexDigest(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), b=>b.toString(16).padStart(2,"0")).join("");
}
export async function requireAdminService(request: Request) {
  const expected = (env as unknown as AdminEnvironment).ADMIN_SERVICE_TOKEN?.trim();
  const denied = () => adminJson({ error: "غير مصرح." }, 401);
  if (!expected || expected.length < 32) return adminJson({error:"ربط خدمة الإدارة غير مهيأ."},503);
  const match = (request.headers.get("authorization") || "").match(/^Bearer\s+([A-Za-z0-9_-]{32,200})$/);
  if (match && secureEqual(expected, match[1])) return null;
  const timestamp=request.headers.get("x-sabeq-timestamp") || "", nonce=request.headers.get("x-sabeq-nonce") || "", signature=request.headers.get("x-sabeq-signature") || "";
  if (!/^\d{13}$/.test(timestamp) || Math.abs(Date.now()-Number(timestamp))>60000 || !/^[a-f0-9-]{36}$/i.test(nonce) || !/^[a-f0-9]{64}$/.test(signature)) return denied();
  const body=await request.clone().text();
  if(new TextEncoder().encode(body).byteLength>200000) return denied();
  const url=new URL(request.url), payload=`${timestamp}\n${nonce}\n${request.method.toUpperCase()}\n${url.pathname}${url.search}\n${await hexDigest(body)}`;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(expected),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const actual=Array.from(new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(payload))),b=>b.toString(16).padStart(2,"0")).join("");
  if(!secureEqual(actual,signature)) return denied();
  try {
    const db=getD1();
    const inserted=await db.prepare("INSERT INTO api_rate_limits (key,bucket,count) VALUES (?,'admin-bridge-nonce',1) ON CONFLICT(key,bucket) DO NOTHING RETURNING key").bind(nonce).first();
    if(!inserted) return denied();
    await db.prepare("DELETE FROM api_rate_limits WHERE bucket='admin-bridge-nonce' AND updated_at < datetime('now','-5 minutes')").run();
    return null;
  } catch { return adminJson({error:"تعذر التحقق من ربط الإدارة مؤقتاً."},503); }
}

export function adminJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
