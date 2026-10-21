'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const TRUSTED_ISSUER = 'https://sabeq-legal-public.centrino.chatgpt.site';
const JWKS_URL = TRUSTED_ISSUER + '/api/management/jwks';

function createOperationsMonitor({ dataDir, databasePath, fetcher = fetch, publicKeys }) {
  const filename = path.join(dataDir, 'operations-monitor.sqlite');
  const db = new DatabaseSync(filename);
  fs.chmodSync(filename, 0o600);
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS operations_records (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL, client_name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '',
      case_type TEXT NOT NULL DEFAULT '', case_number TEXT NOT NULL DEFAULT '', input_json TEXT NOT NULL,
      output_text TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, error_code TEXT NOT NULL DEFAULT '',
      origin TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS operations_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT OR IGNORE INTO operations_meta (key,value) VALUES ('tracking_since', CURRENT_TIMESTAMP);
    UPDATE operations_records
      SET client_name='زائر', email='', case_type='', case_number='', input_json='{}', output_text=''
      WHERE kind='memo' AND (client_name!='زائر' OR email!='' OR case_type!='' OR case_number!='' OR input_json!='{}' OR output_text!='');`);
  let keyCache = null;
  const nonces = new Map();
  function track(req, res, next) {
    const types = { '/api/legal/memo': 'memo', '/api/contact': 'contact', '/api/consultations': 'consultation' };
    const kind = types[String(req.originalUrl || req.path).split('?')[0]];
    if (req.method !== 'POST' || !kind) return next();
    const body = req.body || {}, input = {};
    const fields = kind === 'memo' ? [] : ['name','email','phone','subject','message','caseType'];
    for (const key of fields) if (typeof body[key] === 'string') input[key] = body[key].slice(0, 6000);
    const id = crypto.randomUUID();
    try {
      db.prepare("INSERT INTO operations_records (id,kind,client_name,email,case_type,case_number,input_json,status,origin) VALUES (?,?,?,?,?,?,?,'running',?)")
        .run(id,kind,kind === 'memo' ? 'زائر' : String(body.name || 'طلب موقع').slice(0,200),kind === 'memo' ? '' : String(body.email || '').slice(0,180),kind === 'memo' ? '' : String(body.caseType || '').slice(0,160),'',JSON.stringify(input),String(req.headers.origin || '').slice(0,200));
    } catch { return res.status(503).json({ error: 'تعذر تسجيل الطلب في سجل المكتب. أعد المحاولة.' }); }
    let finished = false;
    const originalJson = res.json;
    const finish = (payload, cancelled) => {
      if (finished) return; finished = true;
      const memoCompleted = kind === 'memo' && typeof payload?.memo === 'string' && payload.memo.trim().length > 0;
      const status = cancelled ? 'cancelled' : res.statusCode >= 400 ? 'failed' : kind === 'memo' ? (memoCompleted ? 'needs_review' : 'failed') : 'new';
      try { db.prepare('UPDATE operations_records SET output_text=?,status=?,error_code=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run('',status,status==='failed'?`http_${res.statusCode}`:'',id); }
      catch { /* The accepted request remains visible as running; no payload enters logs. */ }
    };
    res.json = function captureJson(payload) { finish(payload,false); return originalJson.call(this,payload); };
    if (kind !== 'memo') {
      const chunks = []; let size = 0;
      const write = res.write, end = res.end;
      res.write = function captureWrite(chunk, ...args) { if (chunk && size < 100000) { const data=Buffer.from(chunk);chunks.push(data);size+=data.length; } return write.call(this,chunk,...args); };
      res.end = function captureEnd(chunk,...args) { if (chunk && size < 100000)chunks.push(Buffer.from(chunk));let value;try{value=JSON.parse(Buffer.concat(chunks).toString());}catch{}finish(value,false);return end.call(this,chunk,...args); };
    }
    res.on('close',()=>finish(null,!res.writableFinished));
    next();
  }
  async function verify(request) {
    const token = String(request.headers['x-sabeq-operations'] || '');
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token) || token.length > 3000) return false;
    try {
      const [payload,signature] = token.split('.'), claims=JSON.parse(Buffer.from(payload,'base64url').toString());
      const now = Math.floor(Date.now()/1000);
      if (claims.iss!==TRUSTED_ISSUER || claims.aud!=='sabeq-official-operations' || !Number.isInteger(claims.exp) || claims.exp<now || claims.exp>now+90 || claims.path!==request.originalUrl || !/^[0-9a-f-]{36}$/i.test(claims.nonce || '')) return false;
      if (!keyCache || keyCache.expires < Date.now()) {
        let keys=publicKeys;
        if (!keys) { const response=await fetcher(JWKS_URL,{redirect:'error',signal:AbortSignal.timeout(10000)});if(!response.ok)return false;const raw=await response.text();if(raw.length>10000)return false;keys=JSON.parse(raw).keys; }
        if (!Array.isArray(keys) || keys[0]?.kty!=='EC' || keys[0]?.crv!=='P-256' || keys[0]?.d) return false;
        keyCache={key:await crypto.webcrypto.subtle.importKey('jwk',keys[0],{name:'ECDSA',namedCurve:'P-256'},false,['verify']),expires:Date.now()+300000};
      }
      if (!await crypto.webcrypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},keyCache.key,Buffer.from(signature,'base64url'),Buffer.from(payload))) return false;
      for (const [key,expires] of nonces) if (expires<now)nonces.delete(key);
      if (nonces.has(claims.nonce)) return false;
      nonces.set(claims.nonce,claims.exp);
      return true;
    } catch { return false; }
  }
  function history({ q = '', status = '', limit = 50, offset = 0, id = '' } = {}) {
    let source;
    try {
      if (!fs.existsSync(databasePath)) return { available:false, rows:[] };
      source = new DatabaseSync(databasePath,{readOnly:true});
      const columns=id?`m.content AS output_text, json_object('title',c.title,'court',c.court,'caseNumber',c.case_number,'facts',c.facts,'requests',c.claims,'partyRole',c.client_role) AS input_json,`:'';
      const records=source.prepare(`SELECT 'history:' || m.id AS id, u.name AS client_name, u.email, c.case_type, c.case_number, 'needs_review' AS status,
        m.created_at, m.created_at AS updated_at, ${columns}
        '' AS error_code, 'user' AS visitor_type FROM memos m JOIN cases c ON c.id=m.case_id JOIN users u ON u.id=m.user_id
        WHERE (? = '' OR 'history:' || m.id = ?) AND (? = '' OR u.name LIKE ? OR u.email LIKE ? OR c.case_number LIKE ?)
          AND (? = '' OR ? = 'needs_review') ORDER BY m.created_at DESC LIMIT ? OFFSET ?`).all(id,id,q,`%${q}%`,`%${q}%`,`%${q}%`,status,status,limit,offset);
      const total=source.prepare('SELECT COUNT(*) AS total FROM memos').get().total;
      return {available:true,rows:records,total};
    } catch { return {available:false,rows:[]}; }
    finally { source?.close(); }
  }
  async function route(req,res) {
    res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
    if (!await verify(req)) return res.status(401).json({error:'غير مصرح.'});
    const limit=Math.max(1,Math.min(50,Number(req.query.limit)||50)),offset=Number(req.query.offset)||0;
    if(!Number.isSafeInteger(offset)||offset<0||offset>100000)return res.status(400).json({error:'صفحة غير صحيحة.'});
    const q=String(req.query.q||'').trim().slice(0,160),status=String(req.query.status||'').slice(0,50),kind=String(req.query.kind||'summary');
    if(req.query.recordId){
      const id=String(req.query.recordId).slice(0,100);
      const record=id.startsWith('history:')?history({id,limit:1}).rows[0]:db.prepare("SELECT * FROM operations_records WHERE id=? AND kind='memo'").get(id);
      return res.json({revision:'operations-monitor-1',record:record||null});
    }
    const old=history({q,status,limit,offset});
    const fields='id, client_name, email, case_type, case_number, status, error_code, created_at, updated_at';
    const current=kind==='memos'?db.prepare(`SELECT ${fields} FROM operations_records WHERE kind='memo' AND (?='' OR client_name LIKE ? OR email LIKE ? OR case_number LIKE ?) AND (?='' OR status=?) ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(q,`%${q}%`,`%${q}%`,`%${q}%`,status,status,limit,offset):[];
    const inbox=kind==='inbox'?db.prepare("SELECT id,client_name AS sender,email,COALESCE(json_extract(input_json,'$.subject'),json_extract(input_json,'$.caseType'),'رسالة موقع') AS subject,COALESCE(json_extract(input_json,'$.message'),'') AS body_text,status,created_at AS received_at FROM operations_records WHERE kind!='memo' AND (?='' OR client_name LIKE ? OR email LIKE ? OR input_json LIKE ?) ORDER BY created_at DESC LIMIT ? OFFSET ?").all(q,`%${q}%`,`%${q}%`,`%${q}%`,limit,offset):[];
    const totals=db.prepare("SELECT COUNT(CASE WHEN kind='memo' THEN 1 END) AS memos, SUM(kind='memo' AND status='running') AS running,SUM(kind='memo' AND status='failed') AS failed,SUM(kind!='memo') AS messages FROM operations_records").get();
    const events=kind==='summary'?db.prepare('SELECT id,kind,client_name,status,updated_at FROM operations_records ORDER BY updated_at DESC LIMIT 30').all():[];
    return res.json({revision:'operations-monitor-1',trackingSince:db.prepare("SELECT value FROM operations_meta WHERE key='tracking_since'").get()?.value,
      historyAvailable:old.available,totals:{...totals,memos:Number(totals.memos||0)+Number(old.total||0)},
      memos:kind==='memos'?[...current.map(r=>({...r,visitor_type:'guest'})),...old.rows].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))):[],
      inbox,hasMore:kind==='memos'?current.length===limit||old.rows.length===limit:inbox.length===limit,
      events:events.map(r=>({id:r.id+':'+r.status,source:'official',kind:r.kind,title:(r.kind==='memo'?'طلب مذكرة — ':'طلب موقع — ')+r.client_name,severity:r.status==='failed'?'warning':'info',created_at:r.updated_at}))});
  }
  return {track,route,verify,close:()=>db.close()};
}
module.exports={createOperationsMonitor,TRUSTED_ISSUER};
