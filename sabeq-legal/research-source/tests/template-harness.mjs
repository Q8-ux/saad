import { readFileSync,mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { spawnSync } from 'node:child_process';
export function load(path,deps={}) {
 const exports={};const source=readFileSync(new URL(path,import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(js,{exports,require:name=>{if(name.endsWith("/case-reasoning")||name==="./case-reasoning")return load("../lib/case-reasoning.ts");if(name === '@/data/legal-sources/reviewed.json') return JSON.parse(readFileSync(new URL('../data/legal-sources/reviewed.json',import.meta.url),'utf8')); if(name.endsWith('/legal-source-coverage')||name==='./legal-source-coverage') return load('../lib/legal-source-coverage.ts',{'./legal-search':{isJudgmentEvidence:s=>/حكم|احكام|أحكام|قضائ|تمييز/.test(s.title+' '+s.documentType)}}); if(name.endsWith('/official-legislation')||name === './official-legislation') return load('../lib/official-legislation.ts'); if(name.endsWith('/legal-citation-review')||name === './legal-citation-review') return load('../lib/legal-citation-review.ts'); if(name.endsWith('/memo-language'))return load('../lib/memo-language.ts');if(name.endsWith('/interface-language'))return load('../lib/interface-language.ts');if(name.endsWith('/pleading-document')||name==='./pleading-document')return load('../lib/pleading-document.ts');if(name.endsWith('/legal-language'))return load('../lib/legal-language.ts');if(name.startsWith('@/data/'))return JSON.parse(readFileSync(new URL('../'+name.slice(2),import.meta.url),'utf8'));if(!(name in deps))throw Error('Missing test dependency '+name);return deps[name];},console,URL,Request,Response,Headers,TextEncoder,TextDecoder,Uint8Array,DataView,ReadableStream,crypto,atob,btoa,setTimeout,clearTimeout,fetch,AbortSignal});return exports;
}
export function templateHarness() {
 const directory=mkdtempSync(join(tmpdir(),'sabeq-template-')),path=join(directory,'db.sqlite'),objects=new Map();let writes=0;
 const sql=(query,bindings=[])=>{const r=spawnSync('python',['-c',`import sqlite3,json,sys
p=json.load(sys.stdin);db=sqlite3.connect(p['path']);db.row_factory=sqlite3.Row
c=db.execute(p['sql'],p['bindings']);rows=[dict(r) for r in c.fetchall()];db.commit();print(json.dumps(rows))`],{input:JSON.stringify({path,sql:query,bindings}),encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return JSON.parse(r.stdout);};
 const migration=readFileSync(new URL('../drizzle/0003_exotic_mandroid.sql',import.meta.url),'utf8');for(const statement of migration.split('--> statement-breakpoint'))sql(statement);
 const database={prepare(query){let bindings=[];return {bind(...values){bindings=values;return this;},async first(){return sql(query,bindings)[0]||null;},async all(){return {results:sql(query,bindings)};},async run(){sql(query,bindings);return {success:true};}};}};
 const bucket={async head(key){return objects.has(key)?{size:objects.get(key).bytes.length}:null;},async put(key,bytes,options){writes++;objects.set(key,{bytes,options});},async get(key){const obj=objects.get(key);return obj?{body:new Response(obj.bytes).body,customMetadata:obj.options.customMetadata}:null;}};
 const security=load('../lib/request-security.ts',{'@/db':{getD1:()=>database}});
 const templates=load('../lib/approved-templates.ts',{'cloudflare:workers':{env:{DOCUMENTS:bucket}},'@/db':{getD1:()=>database},'./request-security':security});
 return {templates,objects,database,bucket,security,sql,get writes(){return writes;},cleanup:()=>rmSync(directory,{recursive:true,force:true})};
}
