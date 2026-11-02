import { env } from "cloudflare:workers";
import { RequestError } from "@/lib/request-security";

const base64url = (data: Uint8Array) => btoa(String.fromCharCode(...data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function vaultKey() {
  const secret = (env as unknown as { AUTH_SECRET?: string }).AUTH_SECRET || "";
  if (secret.length < 32) throw new RequestError("مفتاح حماية التكامل غير مهيأ.", 503);
  return crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`sabeq-management-vault:${secret}`)), "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function sealConfig(value: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await vaultKey(), new TextEncoder().encode(JSON.stringify(value)));
  return `${base64url(iv)}.${base64url(new Uint8Array(ciphertext))}`;
}
export async function openConfig<T>(value: string): Promise<T> {
  try {
    const [iv, ciphertext] = value.split(".").map(part => Uint8Array.from(atob(part.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)));
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await vaultKey(), ciphertext);
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch { throw new RequestError("تعذرت قراءة إعدادات التكامل المحمية. أعد حفظ المفتاح.", 503); }
}
