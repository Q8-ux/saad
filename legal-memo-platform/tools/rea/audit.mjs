import { createHash } from 'node:crypto';
import { closeSync, copyFileSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const toolDir = path.dirname(fileURLToPath(import.meta.url));
export const REA_VERSION = '6.5.0';
export const FEATURES = ['/api/legal/analyze-documents', '/api/legal/assistant', '/api/legal/memo'];

export function checkedFile(root, relative) {
  const absolute = path.resolve(root, relative);
  if (!absolute.startsWith(root + path.sep) || realpathSync(absolute) !== absolute || !lstatSync(absolute).isFile()) {
    throw new Error('Refusing a path outside the Sabeq code scope or a symbolic link');
  }
  return absolute;
}

export function publishedScripts(html) {
  const paths = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)].map(match => {
    const source = match[1].replace(/^\/saad\/sabeq-legal\//, '').replace(/^\.\//, '');
    if (!/^assets\/[A-Za-z0-9_.-]+\.js$/.test(source)) throw new Error('The published script is not a local Sabeq asset');
    return `sabeq-legal/${source}`;
  });
  if (!paths.length) throw new Error('No published Sabeq script was found');
  return [...new Set(paths)];
}

export function collectInputs(root) {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  const scripts = publishedScripts(readFileSync(checkedFile(root, 'sabeq-legal/index.html'), 'utf8'));
  const source = tracked.filter(name => /^sabeq-legal\/research-source\/(app|lib)\/.*\.(?:[cm]?js|jsx|ts|tsx)$/.test(name));
  const backend = tracked.filter(name => /^legal-memo-platform\/[^/]+\.js$/.test(name));
  if (!tracked.includes('legal-memo-platform/package.json')) throw new Error('Missing tracked backend package manifest');
  const groups = { 'frontend-source': source, 'published-bundle': scripts, backend: [...backend, 'legal-memo-platform/package.json'] };
  for (const files of Object.values(groups)) {
    if (!files.length) throw new Error('A Sabeq analysis target is empty');
    for (const file of files) {
      if (!tracked.includes(file)) throw new Error('Refusing an untracked Sabeq analysis input');
      checkedFile(root, file);
    }
  }
  return groups;
}

// Project only fixed metadata; raw Evidence can contain source literals and never enters a report.
export function summarize(result, exitCode) {
  const failed = exitCode !== 0 || Boolean(result.error);
  const evidence = failed ? result.details?.partial_observation : result;
  const normalized = evidence?.normalized_result;
  if (!failed && (!evidence?.evidence_id || !normalized?.graph || !normalized?.statistics)) {
    throw new Error('REA returned an unrecognized analysis envelope');
  }
  const graph = normalized?.graph;
  const stats = normalized?.statistics;
  return {
    status: failed ? 'failed' : 'analyzed',
    error_code: failed ? String(result.code || 'rea-process-failed') : null,
    evidence_id: evidence?.evidence_id || null,
    artifact_sha256: normalized?.root_artifact_sha256 || null,
    graph_id: graph?.graph_id || null,
    graph_coverage: graph?.coverage?.status || 'unavailable',
    statistics: Object.fromEntries(['relevant_files', 'parsed_javascript_files', 'modules', 'parse_failures'].map(key => [key, stats?.[key] ?? null])),
    unknown_nodes: graph?.nodes?.filter(node => node.kind === 'unknown').length ?? null,
    limitation_count: evidence?.limitations?.length ?? null,
  };
}

function execute(cli, args, directory) {
  const output = path.join(directory, 'command-output.json');
  const fd = openSync(output, 'w', 0o600);
  let processResult;
  try {
    processResult = spawnSync(process.execPath, [cli, ...args, '--format', 'json'], {
      stdio: ['ignore', fd, 'inherit'], timeout: 240_000,
    });
  } finally { closeSync(fd); }
  let result;
  try { result = JSON.parse(readFileSync(output, 'utf8')); }
  catch { result = { error: true, code: processResult.error?.code === 'ETIMEDOUT' ? 'rea-timeout' : 'invalid-rea-json' }; }
  return { result, exitCode: processResult.status ?? 1 };
}

function trace(cli, evidence, feature, directory) {
  const request = path.join(directory, 'trace-input.json');
  writeFileSync(request, JSON.stringify({ application: evidence, seed: { kind: 'string', value: feature, match: 'contains', case_sensitive: true }, direction: 'both' }), { mode: 0o600 });
  const { result, exitCode } = execute(cli, ['trace-application-feature', request], directory);
  const normalized = result.normalized_result;
  const failed = exitCode !== 0 || Boolean(result.error) || !normalized?.coverage || !normalized?.summary;
  return {
    feature, status: failed ? 'failed' : normalized.coverage.status,
    error_code: failed ? String(result.code || 'invalid-trace-envelope') : null,
    evidence_id: result.evidence_id || null,
    source_graph_status: normalized?.coverage?.source_graph_status || 'unavailable',
    statistics: Object.fromEntries(['matched_seeds', 'traced_nodes', 'traced_edges', 'unknown_facts', 'unavailable_facts'].map(key => [key, normalized?.summary?.[key] ?? null])),
  };
}

export function summarizeSemantics(result, exitCode) {
  const normalized = result.normalized_result;
  const failed = exitCode !== 0 || Boolean(result.error) || !normalized?.status || !normalized?.summary || !normalized?.coverage;
  return {
    status: failed ? 'failed' : normalized.status,
    error_code: failed ? String(result.code || 'invalid-semantic-envelope') : null,
    evidence_id: result.evidence_id || null,
    coverage: normalized?.coverage?.status || 'unavailable',
    statistics: Object.fromEntries(['total_seed_matches', 'traversed_nodes', 'traversed_relations', 'relevant_unknowns'].map(key => [key, normalized?.summary?.[key] ?? null])),
  };
}

function traceSemantics(cli, evidence, feature, directory) {
  const request = path.join(directory, 'semantic-input.json');
  writeFileSync(request, JSON.stringify({ application: evidence, query: { seed: { kind: 'literal', value: feature }, direction: 'forward-influence' } }), { mode: 0o600 });
  const { result, exitCode } = execute(cli, ['trace-javascript-semantics', request], directory);
  return summarizeSemantics(result, exitCode);
}

export function markdown(report) {
  const rows = report.targets.map(target => `| ${target.target} | ${target.status} | ${target.graph_coverage} | ${target.statistics.parsed_javascript_files ?? '—'} | ${target.unknown_nodes ?? '—'} |`).join('\n');
  const traces = report.targets.flatMap(target => (target.traces || []).map(item => `| ${target.target} | ${item.feature} | ${item.status} | ${item.statistics.matched_seeds ?? '—'} | ${item.semantic?.status ?? '—'} | ${item.semantic?.statistics.total_seed_matches ?? '—'} |`)).join('\n');
  return `# تحليل سابق بواسطة REA\n\nالإصدار: ${REA_VERSION}\n\nالتزام المصدر: ${report.source_commit}\n\nحالة تنفيذ التحليل: ${report.status}\n\n| الجزء | التنفيذ | تغطية الرسم | الملفات المحللة | عقد غير معلومة |\n|---|---|---|---:|---:|\n${rows}\n\n| الجزء | نقطة بدء التتبع | التغطية البنيوية | مواضع المطابقة | تتبع البيانات | مواضع البيانات |\n|---|---|---|---:|---|---:|\n${traces}\n\nتحليل ثابت للكود المتتبع في Git فقط. التتبع يثبت علاقات مرصودة أو مستنتجة في الكود؛ لا يثبت أن الوظيفة عملت على الخادم. حالة no-match لا تثبت غياب الميزة. عند غياب المطابقة البنيوية، يفحص تتبع البيانات الانتقال من نص نقطة الطلب عبر العلاقات التي استخرجها REA. found لا يثبت نجاح الطلب الفعلي، وpartial أو ambiguous تبقى غير محسومة.\n\nمصدر الواجهة المنشور في GitHub لقطة غير مكتملة، والحزمة المنشورة مصغرة ومن دون source maps. تبقى الواردات الخارجية والعلاقات الديناميكية ضمن حدود التحليل.\n\nهذا الفحص لا يستدعي النموذج، ولا يولد مذكرة، ولا يراجع صحة القوانين أو الأحكام، ولا يرفع ملفات قضايا. raw Evidence يحذف بعد استخراج الأعداد والمعرفات والبصمات.\n\n## ما الذي قد نكون أغفلناه؟\n\nمطابقة الكود مع تشغيل الخدمة الفعلي والأجزاء غير الموجودة في لقطة المصدر تحتاج فحص تشغيل منفصل. بيانات العملاء والمستندات الخاصة مستبعدة بالكامل.\n`;
}

export async function audit(root, outputDirectory) {
  root = realpathSync(root);
  const groups = collectInputs(root);
  const installed = JSON.parse(readFileSync(path.join(toolDir, 'node_modules/rea-agents/package.json'), 'utf8'));
  if (installed.version !== REA_VERSION) throw new Error('Install the pinned REA release with npm ci');
  const cli = path.join(toolDir, 'node_modules/rea-agents/scripts/rea.mjs');
  const temporary = mkdtempSync(path.join(tmpdir(), 'sabeq-rea-'));
  const report = {
    schema_version: 1, tool: 'REA', version: REA_VERSION, generated_at: new Date().toISOString(),
    source_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    status: 'analyzed', runtime_verified: false, legal_accuracy_verified: false, targets: [],
  };
  try {
    for (const [name, files] of Object.entries(groups)) {
      const directory = path.join(temporary, name);
      const artifact = path.join(directory, 'artifact');
      mkdirSync(artifact, { recursive: true, mode: 0o700 });
      const inputs = files.map(relative => {
        const source = checkedFile(root, relative);
        const local = name === 'backend' ? relative.replace(/^legal-memo-platform\//, '') : name === 'frontend-source' ? relative.replace(/^sabeq-legal\/research-source\//, '') : relative.replace(/^sabeq-legal\//, '');
        const destination = path.join(artifact, local);
        mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
        copyFileSync(source, destination);
        return { path: relative, sha256: createHash('sha256').update(readFileSync(destination)).digest('hex') };
      });
      const { result, exitCode } = execute(cli, ['analyze-javascript-application', artifact, '--analysis-timeout-ms', '120000'], directory);
      const target = { target: name, inputs, ...summarize(result, exitCode), traces: [] };
      if (target.status === 'analyzed') {
        for (const feature of FEATURES) {
          const featureTrace = trace(cli, result, feature, directory);
          if (featureTrace.status === 'no-match') featureTrace.semantic = traceSemantics(cli, result, feature, directory);
          target.traces.push(featureTrace);
        }
      }
      if (target.status === 'failed' || target.traces.some(item => item.status === 'failed' || item.semantic?.status === 'failed')) report.status = 'failed';
      report.targets.push(target);
      console.log(`${name}: ${target.status}; graph coverage: ${target.graph_coverage}`);
    }
  } finally { rmSync(temporary, { recursive: true, force: true }); }
  mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
  writeFileSync(path.join(outputDirectory, 'report.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  writeFileSync(path.join(outputDirectory, 'report.md'), markdown(report), { mode: 0o600 });
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = await audit(path.resolve(toolDir, '../../..'), path.resolve(process.env.SABEQ_REA_REPORT_DIR || path.join(toolDir, 'reports')));
    if (report.status === 'failed') process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
