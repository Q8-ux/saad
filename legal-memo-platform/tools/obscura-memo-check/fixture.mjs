import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import vm from 'node:vm';

const boltOrigin = 'https://q8-ux-sabeq-admin-co-u4ma.bolt.host';
const boltBridge = 'https://sabeq-legal-public.centrino.chatgpt.site/api/integrations/bolt-memos';
const adminService = 'https://tuhxdirrffnxtosqaoiq.supabase.co/functions/v1/';
const sessionToken = 'sabeq-obscura-synthetic-session';
export const fixtureName = 'طرف اصطناعي لفحص محرر سابق';

const client = new URL('../../../sabeq-legal/research-source/', import.meta.url);
const { transpileModule, ModuleKind, ScriptTarget } = createRequire(client)('typescript');
const input = {
  caseType: 'مدني', court: 'المحكمة الكلية', clientName: fixtureName,
  otherParty: 'خصم اصطناعي', partyRole: 'مدعٍ',
  facts: 'واقعة اصطناعية للاختبار بشأن مبلغ لم يتم سداده.',
  requests: 'إلزام الخصم بسداد مبلغ الاختبار.',
};
const application = 'ينصب الخلاف على مبلغ لم يتم سداده بحسب المدخلات، لذلك يلزم فحص أصل التعامل وتحديد الرصيد محل النزاع.';
const objection = 'قد ينازع الخصم في بقاء الرصيد أو يدعي سداداً لم ترد مستنداته ضمن بيانات الاختبار.';
const response = 'والرد أن حسم هذا الاعتراض يتوقف على مطابقة المستندات وبيان أي دفعة متصلة بالمطالبة دون افتراض ثبوت السداد.';
const passage = {
  documentId: 1, chunkId: 1, documentType: 'مستند', title: 'مستند اختبار اصطناعي',
  text: 'مستند افتراضي يذكر وجود مبلغ غير مسدد في عينة اختبار برمجية.',
  reference: 'مستند اختبار', sourceUrl: 'https://example.invalid/fixture', officialSource: 'عينة اصطناعية',
};
const content = {
  facts: input.facts, requests: input.requests, grounds: [application, objection, response + ' 【م1】'].join('\n'),
  fields: {}, factualNotes: [], legalResearchNotes: '',
};

function fixtureText({ schema, input: payload }) {
  if (schema.properties.clientRole) return JSON.stringify({
    clientRole: input.partyRole, opponentRole: 'مدعى عليه', characterization: 'مطالبة',
    issues: [{ issue: 'المبلغ', factQuote: 'مبلغ لم يتم سداده', document: '', sourceMarkers: ['م1'],
      application, counterargument: objection, response, proposedRelief: input.requests, missing: '' }],
    missingFacts: [], researchGaps: [],
  });
  if (schema.properties.checks) {
    const { checkOptions, quoteOptions } = JSON.parse(payload);
    const choice = checkOptions.find(option => option.status === 'addressed' && option.applicationQuote.includes(application));
    const quote = text => quoteOptions.find(option => option.quote.includes(text))?.quoteKey;
    return JSON.stringify({
      checks: [{ checkKey: choice.checkKey, reason: 'تغطية المطالبة والاعتراض والرد في عينة الاختبار',
        substance: { opposingQuoteKey: quote(objection), responseQuoteKey: quote(response), sourceMarkers: ['م1'] } }],
      roleConsistent: true, factsPreserved: true, reliefConsistent: true, unsupportedAssertions: [],
    });
  }
  if (schema.properties.facts) return JSON.stringify(content);
  throw new Error('Unexpected fixture model request');
}

const json = (data, status = 200) => Response.json(data, { status });
const text = (body, type = 'text/html') => new Response(body, { headers: { 'Content-Type': `${type}; charset=utf-8` } });
const digest = value => createHash('sha256').update(value).digest('hex');

export async function deployedShell() {
  const read = async path => {
    const response = await fetch(boltOrigin + path, { redirect: 'error', signal: AbortSignal.timeout(18_000) });
    if (!response.ok) throw new Error('Published Bolt asset unavailable');
    return response.text();
  };
  const page = await read('/');
  const path = /<script\b[^>]*\bsrc="(\/sabeq-console\/shell\.js\?v=[a-f0-9]{16})"/iu.exec(page)?.[1];
  if (!path) throw new Error('Published Bolt script reference missing');
  return { script: await read(path), version: path.split('=')[1] };
}

function siteRoutes(sqlite, emptyEditor) {
  for (const path of ['tests/fixtures/management-source-tables.sql', 'drizzle/0005_icy_dark_phoenix.sql', 'drizzle/0011_saved_memo_revisions.sql']) {
    sqlite.exec(readFileSync(new URL(path, client), 'utf8'));
  }
  const db = { prepare(sql) {
    const statement = sqlite.prepare(sql);
    return { bind(...params) { return {
      first: async () => statement.get(...params) ?? null,
      all: async () => ({ results: statement.all(...params) }),
      run: async () => statement.run(...params),
    }; } };
  } };
  const verification = { valid: true, role: 'admin', username: 'obscura-fixture', must_change_password: false };
  const official = { officialVerificationSummary: () => ({ scope: 'synthetic' }) };
  const dependencies = {
    db: { getD1: () => db },
    'lib/gmail': { sendSavedDraft: async () => {} },
    'lib/meta-secondary-review': { reviewMissingLegalIssues: async () => null },
    'lib/management-auth': { digest },
    'lib/management-integrations': { SERVICE_ORIGIN: new URL(boltBridge).origin },
    'lib/public-auth': { requireMemoUserOrGuest: async () => null },
    'lib/service-settings': { requireServiceEnabled: async () => {} },
    'lib/sadad-payments': { reserveMemoPayment: async () => ({}), completeMemoPayment: async () => {}, releaseMemoPayment: async () => {} },
    'lib/service-records': {},
    'lib/official-legislation': official,
    'lib/approved-templates': { loadApprovedTemplate: async () => ({
      info: { id: 'synthetic', version: 1, kind: 'claim', title: 'نموذج اختبار', sourceFilename: 'synthetic.pdf' },
      definition: { title: 'صحيفة اختبار', paper: 'A4', border: false,
        labels: { subject: 'الموضوع', applicant: 'مقدم الطلب', opponent: 'الخصم', address: 'العنوان', otherAddress: 'العنوان', grounds: 'الدفوع', therefore: 'لذلك', basedOn: 'بناء عليه' },
        clauses: { date: 'تاريخ اصطناعي', processServer: 'إعلان اصطناعي', moved: 'انتقل وأعلن', addressedTo: 'المعلن إليه', whereas: 'وحيث', relief: 'الطلبات', summons: 'دعوة اصطناعية', reservation: 'الحقوق محفوظة', responsibility: 'نموذج اصطناعي' } },
    }) },
    'lib/sabeq-agent-bridge': { agentPipelineEnabled: () => false },
    'lib/openai': { deriveLegalResearchPlan: async () => ({ searchQueries: [], legalIssues: [] }), generateText: async options => fixtureText(options), openAIErrorResponse: () => null },
  };
  function load(path) {
    if (Object.hasOwn(dependencies, path)) return dependencies[path];
    if (path.endsWith('.json')) return JSON.parse(readFileSync(new URL(path, client), 'utf8'));
    const file = new URL(path + '.ts', client);
    const exports = {};
    dependencies[path] = exports;
    const source = readFileSync(file, 'utf8');
    vm.runInNewContext(transpileModule(source, { compilerOptions: {
      module: ModuleKind.CommonJS, target: ScriptTarget.ES2022, esModuleInterop: true,
    } }).outputText, {
      exports, crypto, URL, URLSearchParams, Request, Response, Headers, TextEncoder, TextDecoder, AbortSignal,
      console: { warn() {}, error() {} },
      fetch: async (url, init) => url === adminService + 'admin-verify' && JSON.parse(init.body).token === sessionToken
        ? json(verification) : json({}, 401),
      require: specifier => {
        if (specifier.startsWith('@/')) return load(specifier.slice(2));
        if (specifier.startsWith('./') || specifier.startsWith('../')) return load(new URL(specifier, file).pathname.slice(client.pathname.length));
        throw new Error(`Unexpected fixture dependency ${specifier} in ${path}`);
      },
    });
    return exports;
  }
  load('lib/request-security').enforceRateLimit = async () => {};
  Object.assign(load('lib/legal-search'), {
    searchLegalEvidenceAcross: async () => [passage], searchCassationEvidenceAcross: async () => [], readHandoffEvidence: async () => [],
  });
  const data = load('lib/management-data');
  if (emptyEditor) {
    const read = data.managerMemos;
    data.managerMemos = async url => {
      const result = await read(url);
      if (result.memo) result.memo.output_text = '';
      return result;
    };
  }
  return { generator: load('app/api/legal/memo/route'), bridge: load('app/api/integrations/bolt-memos/route'), verification };
}

const memoPage = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">
<title>اختبار إرسال مذكرة سابق</title><main><h1>إرسال مذكرة اصطناعية</h1>
<form id="memo-fixture"><button>إرسال مذكرة الاختبار</button></form><output id="memo-result"></output></main>
<script src="/fixture-client.js" defer></script></html>`;
const clientScript = `document.querySelector('#memo-fixture').addEventListener('submit', async event => {
  event.preventDefault();
  const output = document.querySelector('#memo-result');
  try {
    const response = await fetch('/api/legal/memo', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(${JSON.stringify(input)})});
    const result = await response.json();
    output.dataset.state = response.ok && result.requestId && result.memo ? 'saved' : 'failed';
  } catch { output.dataset.state = 'failed'; }
});`;

const adminPage = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">
<title>اختبار محرر إدارة سابق</title><header id="header-action"></header><main id="app"></main>
<script src="/fixture-network.js" defer></script><script src="/shell.js" defer></script></html>`;
const adminNetwork = `const localFetch = window.fetch.bind(window);
window.fetch = (url, options) => {
  if (url === ${JSON.stringify(boltBridge)}) return localFetch('/fixture/bridge', options);
  if (typeof url === 'string' && url.startsWith(${JSON.stringify(adminService)})) {
    return localFetch('/fixture/auth/' + url.slice(${adminService.length}), options);
  }
  return Promise.reject(new Error('Unmapped fixture request'));
};`;

export async function startFixture(script, emptyEditor) {
  const sqlite = new DatabaseSync(':memory:');
  let routes;
  try { routes = siteRoutes(sqlite, emptyEditor); }
  catch (error) { sqlite.close(); throw error; }
  let saved;

  const server = createServer(async (request, res) => {
    try {
      const address = `http://127.0.0.1:${server.address().port}`;
      let reply;
      if (request.method === 'GET') {
        reply = {
          '/memo': () => text(memoPage), '/fixture-client.js': () => text(clientScript, 'text/javascript'),
          '/admin/': () => text(adminPage), '/shell.js': () => text(script, 'text/javascript'),
          '/fixture-network.js': () => text(adminNetwork, 'text/javascript'),
        }[request.url]?.();
      } else if (request.method === 'POST') {
        const buffers = [];
        let size = 0;
        for await (const part of request) {
          size += part.length;
          if (size > 8_192) throw new Error('Fixture request too large');
          buffers.push(part);
        }
        const body = Buffer.concat(buffers).toString('utf8');
        const headers = { 'Content-Type': 'application/json' };
        if (request.url === '/api/legal/memo' && !saved) {
          reply = await routes.generator.POST(new Request(address + request.url, { method: 'POST', headers, body }));
          const result = await reply.clone().json();
          saved = reply.ok ? result : { status: reply.status, stage: result.stage };
        } else if (request.url === '/fixture/bridge') {
          reply = await routes.bridge.POST(new Request(boltBridge, { method: 'POST', body, headers: {
            ...headers, Origin: boltOrigin, Authorization: request.headers.authorization || '',
          } }));
        } else if (request.url === '/fixture/auth/admin-login') {
          const auth = JSON.parse(body);
          reply = auth.username === 'obscura-fixture' && auth.password === 'synthetic-fixture-only'
            ? json({ success: true, token: sessionToken }) : json({ success: false }, 401);
        } else if (request.url === '/fixture/auth/admin-verify') {
          reply = JSON.parse(body).token === sessionToken ? json(routes.verification) : json({ valid: false }, 401);
        } else if (/^\/fixture\/auth\/(memo-list|consultation-list|message-list|notification-list)$/u.test(request.url)) {
          reply = json({ success: true });
        }
      }
      reply ??= json({ error: 'Unknown fixture request' }, 404);
      res.writeHead(reply.status, { ...Object.fromEntries(reply.headers),
        'Content-Security-Policy': "default-src 'none'; script-src 'self'; connect-src 'self'",
      });
      res.end(Buffer.from(await reply.arrayBuffer()));
    } catch {
      res.writeHead(500).end('Fixture request failed');
    }
  });
  try {
    await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  } catch (error) {
    sqlite.close();
    throw error;
  }
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    saved: () => saved,
    stored: id => sqlite.prepare('SELECT output_text, status FROM management_memo_requests WHERE id = ?').get(id),
    close: () => new Promise(resolve => { server.close(() => { sqlite.close(); resolve(); }); server.closeAllConnections(); }),
  };
}
