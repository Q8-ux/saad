import serverless from 'serverless-http';
import { Readable } from 'node:stream';
import { createApp } from '../server/app.mjs';
import { attachmentDownloadPath, attachmentPartPath, attachmentPartSize, attachmentStorage,
  downloadAttachment } from '../server/attachments.mjs';
import { modelFromEnvironment } from '../server/model.mjs';
import { initialize, postgresStore } from '../server/store.mjs';

const env = process.env;
const host = env.NEON_BRANCH_ID && env.NEON_FUNCTION_HOST_SUFFIX
  ? `https://${env.NEON_BRANCH_ID}-tahkeem${env.NEON_FUNCTION_HOST_SUFFIX}`
  : '';
const origin = env.APP_ORIGIN || host;
let handlerPromise;

async function start() {
  if (!origin || !origin.startsWith('https://')) throw new Error('Tahkeem needs an HTTPS origin.');
  const uri = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
  if (!uri) throw new Error('PostgreSQL connection not configured.');
  const db = postgresStore(uri.replace('sslmode=require','sslmode=verify-full'));
  try {
    await initialize(db);
  } catch (error) {
    await db.close();
    throw error;
  }
  const storage = attachmentStorage(env);
  const app = createApp({ db, origin, setupHash:env.TAHKEEM_SETUP_TOKEN_SHA256, setupUntil:env.TAHKEEM_SETUP_UNTIL,
    model:modelFromEnvironment({ ...env, NODE_ENV:'production' }), storage });
  return { db, handle: serverless(app, { binary: true }), storage };
}

const bodyLimit = 512 * 1024;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (!handlerPromise) handlerPromise = start().catch(error => {
      handlerPromise = null;
      throw error;
    });
    let running;
    try { running = await handlerPromise; }
    catch (error) {
      console.error('Tahkeem startup failed',error.code || error.name);
      return Response.json({error:'تعذر بدء تحكيم.'},{status:503});
    }
    const download = attachmentDownloadPath.exec(url.pathname);
    if (download && ['GET','HEAD'].includes(request.method)) {
      try {
        const result = await downloadAttachment(running.db, running.storage, {
          method: request.method, get: name => request.headers.get(name),
        }, download[1]);
        return new Response(result.stream ? Readable.toWeb(result.stream) : null, { headers: result.headers });
      } catch (error) {
        return Response.json({ error: error.status ? error.message : 'تعذر تنزيل المرفق.' },
          { status: error.status || 503, headers: { 'Cache-Control': 'no-store' } });
      }
    }

    let body = '';
    if (request.body) {
      const reader = request.body.getReader();
      const chunks = [];
      let bytes = 0;
      const limit = request.method === 'PUT' && attachmentPartPath.test(url.pathname) ? attachmentPartSize : bodyLimit;
      try {
        for (;;) {
          const {done,value} = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > limit) {
            await reader.cancel();
            return Response.json({error:'حجم الطلب أكبر من الحد المسموح.'},{status:413});
          }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      body = Buffer.concat(chunks).toString('base64');
    }
    const headers = Object.fromEntries(request.headers);
    headers.host = new URL(origin).host;
    // Use one shared bucket until the proxy supplies a trusted client address.
    const remoteIp = '127.0.0.1';
    const event = {
      version:'2.0',rawPath:url.pathname,rawQueryString:url.search.slice(1),headers,
      cookies:request.headers.get('cookie')?.split(/;\s*/) || [],
      requestContext:{http:{method:request.method,path:url.pathname,sourceIp:remoteIp,protocol:'HTTP/1.1'}},
      body,isBase64Encoded:Boolean(body),
    };
    const output = await running.handle(event,{});
    const replyHeaders = new Headers();
    for (const [key,value] of Object.entries(output.headers ?? {})) replyHeaders.set(key,String(value));
    for (const cookie of output.cookies ?? []) replyHeaders.append('Set-Cookie',cookie);
    const empty = request.method === 'HEAD' || [204,205,304].includes(output.statusCode);
    const payload = output.isBase64Encoded ? Buffer.from(output.body || '', 'base64') : output.body;
    return new Response(empty ? null : payload,{status:output.statusCode,headers:replyHeaders});
  },
};

