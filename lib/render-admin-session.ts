import "server-only";

import { cookies } from "next/headers";

export const RENDER_ADMIN_COOKIE = "__Host-legal_admin";

type RenderAdminRuntime = typeof globalThis & {
  __LEGAL_OFFICE_LOCAL_AUTH_PEPPER__?: string;
};

export type RenderAdminIdentity = {
  authType: "local";
  email: string;
  displayName: string;
  isPlatformAdmin: true;
  initialOfficeName?: string;
};

type TokenPayload = {
  v: 1;
  email: string;
  displayName: string;
  office: string;
  admin: true;
  expiresAt: number;
};

function signingSecret(): string {
  return (globalThis as RenderAdminRuntime).__LEGAL_OFFICE_LOCAL_AUTH_PEPPER__ ?? "";
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function hmac(value: string): Promise<string> {
  const secret = signingSecret();
  if (!secret) throw new Error("Render admin session signing is not configured.");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return toBase64Url(new Uint8Array(signature));
}

export async function createRenderAdminToken(identity: {
  email: string;
  displayName: string;
  isPlatformAdmin?: boolean;
  initialOfficeName?: string;
}, expiresAtIso: string): Promise<string | null> {
  if (!identity.isPlatformAdmin || !signingSecret()) return null;
  const expiresAt = Date.parse(expiresAtIso);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;

  const payload: TokenPayload = {
    v: 1,
    email: identity.email.trim().toLowerCase().slice(0, 180),
    displayName: identity.displayName.trim().slice(0, 180),
    office: (identity.initialOfficeName ?? "").trim().slice(0, 180),
    admin: true,
    expiresAt,
  };
  if (!payload.email) return null;

  const encoded = toBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return `${encoded}.${await hmac(encoded)}`;
}

async function verifyRenderAdminToken(token: string): Promise<RenderAdminIdentity | null> {
  const [encoded, signature, extra] = token.split(".");
  if (extra !== undefined || !encoded || !signature) return null;
  if (!/^[A-Za-z0-9_-]{20,900}$/.test(encoded)) return null;
  if (!/^[A-Za-z0-9_-]{40,120}$/.test(signature)) return null;
  if (!signingSecret()) return null;

  const expected = await hmac(encoded);
  if (!constantTimeEqual(expected, signature)) return null;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encoded)),
    ) as Partial<TokenPayload>;
    if (
      payload.v !== 1 ||
      payload.admin !== true ||
      typeof payload.email !== "string" ||
      typeof payload.displayName !== "string" ||
      typeof payload.office !== "string" ||
      typeof payload.expiresAt !== "number" ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }

    const email = payload.email.trim().toLowerCase();
    if (!email || email.length > 180) return null;

    return {
      authType: "local",
      email,
      displayName: payload.displayName.trim().slice(0, 180) || email,
      isPlatformAdmin: true,
      initialOfficeName: payload.office.trim().slice(0, 180) || undefined,
    };
  } catch {
    return null;
  }
}

export async function getRenderAdminIdentity(): Promise<RenderAdminIdentity | null> {
  const token = (await cookies()).get(RENDER_ADMIN_COOKIE)?.value ?? "";
  if (!token) return null;
  return verifyRenderAdminToken(token);
}
