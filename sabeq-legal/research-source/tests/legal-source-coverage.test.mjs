import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {load} from './template-harness.mjs';
const judge=s=>/احكام|أحكام|قضائ|تمييز/.test(s.title+' '+s.documentType);
const coverage=load('../lib/legal-source-coverage.ts',{'./legal-search':{isJudgmentEvidence:judge}});
const search=load('../lib/legal-search.ts',{'@/db':{getD1:()=>{throw Error('not needed');}}});
test('catalogue URLs never count as statutory evidence or certify completeness',()=>{
 const c=coverage.legalSourceCoverage([]);
 assert.equal(c.sources.length,6); assert.equal(c.status,'no_matching_verified_passage');
 assert.equal(c.legislationPassages,0);assert.equal(c.completeCoverage,false);assert.equal(c.currentConsolidationVerified,false);
 for(const s of c.sources){assert.equal(s.citable,false);assert.match(s.url,/^https:\/\//);}
 assert.match(coverage.formatSourceCoverage([]),/ليست نصوصاً أو أسانيد/);
});
test('connection failure and partial retrieval are distinguishable; unreviewed laws do not inflate coverage',()=>{
 assert.equal(coverage.legalSourceCoverage([],true).status,'lookup_failed');
 const fake={title:'قانون افتراضي',documentType:'قانون'};
 assert.equal(coverage.legalSourceCoverage([fake]).legislationPassages,0);
 const c=coverage.legalSourceCoverage([{...fake,verification:{status:'source_verified'}}]);
 assert.equal(c.status,'partial_passages'); assert.equal(c.legislationPassages,1);assert.equal(c.judgmentPassages,0);
});
test('Arabic prefixed query terms retain original and searchable canonical variants',()=>{
 const q=search.queryTokens('بالعامل وللشركة بالقانون');
 assert.ok(q.includes('العامل'));assert.ok(q.includes('بالعامل'));assert.ok(q.includes('الشركه'));
 const long=search.queryTokens('فصل تعسفي عقد عمل راتب تعويض مطالبة مستحقات مكافأة نهاية الخدمة');assert.ok(long.includes('مكافاه'));
});
test('collector rejects redirects to unofficial hosts, credential URLs and oversized destinations',()=>{
 const r=spawnSync('python',['-c',`import importlib.util
s=importlib.util.spec_from_file_location('collector','scripts/collect_official_sources.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
for u in ['http://www.moj.gov.kw/a.pdf','https://www.moj.gov.kw.evil.test/a.pdf','https://user:password@www.moj.gov.kw/a.pdf','https://127.0.0.1/a.pdf','https://www.moj.gov.kw:444/a.pdf']:
 try:m.safe_url(u)
 except ValueError:pass
 else:raise AssertionError(u)
assert m.safe_url('https://www.moj.gov.kw/a.pdf')
`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
});
test('intake, memo and agent bridge receive the same source coverage without turning catalogues into markers',()=>{
 for(const p of ['app/api/legal/assistant/route.ts','app/api/legal/memo/route.ts','lib/sabeq-agent-bridge.ts'])assert.match(readFileSync(new URL('../'+p,import.meta.url),'utf8'),/legalSourceCoverage/);
 const c=coverage.formatSourceCoverage([]);assert.doesNotMatch(c,/【م\d+】/);
});
