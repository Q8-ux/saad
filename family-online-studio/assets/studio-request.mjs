const relayEndpoint = '/api/scenarist/refine?studioRelay=account';

const base64url = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');

export function makeRelayLogin(username, password, remember = false) {
  const proof = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const relayValues = remember ? [username, password, proof, true] : [username, password, proof];
  const code = 'studio-relay-v1:' + base64url(new TextEncoder().encode(JSON.stringify(relayValues)));
  return { proof, code };
}

export async function studioRequest(apiBase, session, path, options = {}) {
  const base = new URL(apiBase);
  const url = new URL(path, base);
  if (url.origin !== base.origin || !url.pathname.startsWith('/api/') || url.hash) throw new Error('طلب غير صالح.');
  const headers = new Headers(options.headers);
  headers.set('Authorization', 'Bearer ' + session.token);
  if (!session.proof) return fetch(url, { ...options, headers, credentials: 'omit', cache: 'no-store' });

  const original = new Request(url, { ...options, headers });
  const envelope = new FormData();
  envelope.set('session', session.proof);
  envelope.set('path', url.pathname + url.search);
  envelope.set('method', original.method);
  if (original.body) {
    envelope.set('contentType', original.headers.get('Content-Type') ?? '');
    envelope.set('payload', await original.blob(), 'request');
  }
  return fetch(new URL(relayEndpoint, base), {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + session.token },
    body: envelope,
    credentials: 'omit',
    cache: 'no-store',
    signal: options.signal,
  });
}
