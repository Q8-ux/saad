import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'outputs/sabeq-bolt');
fs.mkdirSync(destination, { recursive: true });
const copied = new Set();
const external = new Set();
const typing = new Set();
const forbidden = /(?:^|\/)(?:server-data|app\/api|db|node_modules)(?:\/|$)|(?:legislation-corpus|reviewed-judgments|bound-corpus)/;
const write = (name, text) => {
  const target = path.join(destination, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
};
function resolveImport(specifier, from) {
  if (specifier === 'next/image') return 'github-pages/next-image.tsx';
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) { external.add(specifier); return; }
  const plain = specifier.split('?')[0];
  const base = plain.startsWith('@/') ? plain.slice(2) : path.posix.normalize(path.posix.join(path.posix.dirname(from), plain));
  if (base.startsWith('../') || forbidden.test(base)) throw Error('Disallowed dependency: '+base);
  return [base, ...['.ts','.tsx','.js','.mjs','.json','.css','/index.ts','/index.tsx'].map(ext=>base+ext)].find(name=>fs.existsSync(path.join(root,name)) && fs.statSync(path.join(root,name)).isFile());
}
function copy(name) {
  if (copied.has(name)) return;
  if (forbidden.test(name)) throw Error('Private source cannot be exported: '+name);
  copied.add(name);
  const source = fs.readFileSync(path.join(root,name),'utf8');
  if (name !== 'lib/runtime-urls.ts') write(name,source);
  if (!/\.[cm]?[jt]sx?$/.test(name)) return;
  const ast = ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true);
  function visit(node) {
    if ((ts.isImportDeclaration(node)||ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const typeOnly = node.isTypeOnly || node.importClause?.isTypeOnly || (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings) && !node.importClause.name && node.importClause.namedBindings.elements.every(e=>e.isTypeOnly));
      const resolved=resolveImport(node.moduleSpecifier.text,name);
      if (resolved) { if(typeOnly) typing.add(resolved); else copy(resolved); }
      else if(node.moduleSpecifier.text.startsWith('.')||node.moduleSpecifier.text.startsWith('@/')) throw Error('Missing dependency '+node.moduleSpecifier.text+' in '+name);
    }
    if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])) {
      const resolved=resolveImport(node.arguments[0].text,name); if(resolved)copy(resolved);
    }
    ts.forEachChild(node,visit);
  }
  visit(ast);
}
copy('github-pages/main.tsx');
copy('github-pages/next-image.tsx');
// Type-only modules contribute declarations, never server implementations.
for(const name of typing) {
  if(copied.has(name))continue;
  const source=fs.readFileSync(path.join(root,name),'utf8');
  const ast=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true);
  const declarations=ast.statements.filter(n=>ts.isTypeAliasDeclaration(n)||ts.isInterfaceDeclaration(n)).map(n=>n.getText(ast));
  write(name.replace(/\.tsx?$/,'.d.ts'),declarations.join('\n\n')+'\n');
}
const main=fs.readFileSync(path.join(destination,'github-pages/main.tsx'),'utf8');
write('src/main.tsx',main);
fs.unlinkSync(path.join(destination,'github-pages/main.tsx'));
write('lib/runtime-urls.ts',`const SERVICE_ORIGIN = (import.meta.env.VITE_SABEQ_SERVICE_ORIGIN || 'https://sabeq-legal-public.centrino.chatgpt.site').replace(/\\/$/, '');\nexport function apiUrl(path: string) { return SERVICE_ORIGIN + path; }\nexport function assetUrl(path: string) { return path; }\n`);
write('src/vite-env.d.ts','/// <reference types="vite/client" />\n');
for(const name of ['images','fonts','media']) fs.cpSync(path.join(root,'public',name),path.join(destination,'public',name),{recursive:true});
for(const name of ['privacy.html','privacy-en.html','privacy-ur.html','privacy.css','privacy.js','source.html','source-viewer.js','favicon.svg']) fs.copyFileSync(path.join(root,'public',name),path.join(destination,'public',name));
const original=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const packageJson={name:'sabeq-legal-bolt',version:'1.0.0',private:true,type:'module',engines:{node:original.engines.node},scripts:{dev:'vite --host 0.0.0.0',build:'vite build',preview:'vite preview --host 0.0.0.0'},dependencies:Object.fromEntries(['react','react-dom','lucide-react'].map(name=>[name,original.dependencies[name]])),devDependencies:Object.fromEntries(['vite','@vitejs/plugin-react','typescript','tailwindcss','@tailwindcss/postcss','@types/react','@types/react-dom','@types/node'].map(name=>[name,original.devDependencies[name]]))};
write('package.json',JSON.stringify(packageJson,null,2)+'\n');
write('vite.config.ts',`import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nimport { fileURLToPath, URL } from 'node:url';\nexport default defineConfig({plugins:[react()],resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url)),'next/image':fileURLToPath(new URL('./github-pages/next-image.tsx',import.meta.url))}},build:{sourcemap:false}});\n`);
write('postcss.config.mjs',fs.readFileSync(path.join(root,'postcss.config.mjs'),'utf8'));
write('tsconfig.json',JSON.stringify({compilerOptions:{target:'ES2022',lib:['DOM','DOM.Iterable','ES2022'],module:'ESNext',moduleResolution:'Bundler',jsx:'react-jsx',strict:true,skipLibCheck:true,noEmit:true,esModuleInterop:true,resolveJsonModule:true,baseUrl:'.',paths:{'@/*':['./*'],'next/image':['./github-pages/next-image.tsx']}},include:['src','app','lib','github-pages']},null,2)+'\n');
write('index.html',`<!doctype html>\n<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#071d2a"><meta name="description" content="مجموعة سابق القانونية — الاستشارات والمساعد القانوني والمذكرات وأخبار المجموعة"><link rel="icon" href="/favicon.svg"><title>مجموعة سابق القانونية</title></head><body data-language="ar"><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n`);
write('.gitignore','node_modules/\ndist/\n.env\n.env.local\n');
write('.env.example','VITE_SABEQ_SERVICE_ORIGIN=https://sabeq-legal-public.centrino.chatgpt.site\n');
write('README.md',`# سابق — نسخة Bolt\n\nواجهة مستقلة من موقع مجموعة سابق القانونية، جاهزة لبناء React/Vite.\n\n## التشغيل\n\n1. npm install\n2. npm run dev\n3. npm run build لإنتاج dist.\n\n## المحتوى\n\nالهوية العربية وخط المهند وRTL واللغات الثلاث، الفيديوهات العامة، ستة أخبار قضايا بصورها الأصلية وتواريخ الأحكام، وسياسة الخصوصية. التحليلات اختيارية ومتوقفة حتى موافقة صريحة. لم يُدّع اكتمال أرشيف إنستغرام.\n\n## حد النقل الحالي\n\nهذه نسخة واجهة وليست نقلاً للخلفية. يبقى المساعد والمذكرات وتسجيل الدخول والملفات وقاعدة المصادر في خدمة سابق الحالية. تضبط VITE_SABEQ_SERVICE_ORIGIN عنوانها العام، ولا يوضع في هذا المتغير أي مفتاح أو سر. يحتاج نطاق معاينة Bolt ونطاق النشر المحددان إلى اعتماد صريح في قائمة CORS في الخلفية، ثم فحص الخدمات قبل اعتبار النقل مكتمل الوظائف. لا توجد مفاتيح API أو ملفات قضايا أو قاعدة بيانات خاصة في هذه الحزمة. لم يُنشأ مشروع Bolt بعد ولم يتغير النطاق الرسمي.\n\n## الاستيراد\n\nأنشئ مستودعاً مخصصاً لهذه الملفات فقط، ثم استورده من زر GitHub في Bolt بعد الدخول. لا تستورد مستودع saad متعدد المشاريع كاملاً ولا تمنح التطبيق صلاحيات على مستودعات غير المشروع. احتفظ بأسماء الملفات والأصول. لا تستبدل صور الأخبار بتصاميم مولدة. لا تضف شروح القوانين أو النصائح إلى أخبار المجموعة.\n\n## مصدر الإصلاح\n\nإصلاح الموافقة الصريحة والتنقل بعد السحب مأخوذ من PR57، الالتزام 6f7949434d6627b221c526b0cb6d0bd3dfbc234c. أضيفت الأخبار الثلاثة الموثقة محلياً في 18 أكتوبر 2026. تفصل النسخة عرض الأخبار عن مصادر المساعد القانونية.\n`);
const files=[];
function walk(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){if(['node_modules','dist','TRANSFER-MANIFEST.json'].includes(entry.name))continue;const absolute=path.join(folder,entry.name);if(entry.isDirectory())walk(absolute);else files.push({path:path.relative(destination,absolute),sha256:crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex'),bytes:fs.statSync(absolute).size});}}
walk(destination);
write('TRANSFER-MANIFEST.json',JSON.stringify({name:'سابق — نسخة Bolt',generatedAt:new Date().toISOString(),backendMigrated:false,boltProjectCreated:false,newsCount:6,sourcePrivacyFix:'6f7949434d6627b221c526b0cb6d0bd3dfbc234c',files},null,2)+'\n');
console.log(JSON.stringify({destination,runtimeSources:copied.size,typeOnlyModules:[...typing].filter(n=>!copied.has(n)),externalImports:[...external],files:files.length}));
