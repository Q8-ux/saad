import ts from 'typescript';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export function renderFixture(language='ar', screen='dashboard') {
  const root=resolve(import.meta.dirname,'../source');
  const cache=new Map();
  function load(path) {
    for (const ext of ['', '.tsx', '.ts']) if (existsSync(path+ext)) { path+=ext; break; }
    if(cache.has(path)) return cache.get(path);
    let source=readFileSync(path,'utf8');
    if(path.endsWith('/i18n.tsx')) source=source.replace('(): Language => "ar"',`(): Language => "${language}"`);
    if(path.endsWith('/legal-office-app.tsx')) source=source.replace('useState<PageKey>("dashboard")',`useState<PageKey>("${screen}")`);
    const code=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    const exports={};cache.set(path,exports);
    const req=createRequire(path);
    new Function('require','exports',code)(id=>id.startsWith('.')?load(resolve(dirname(path),id)):req(id),exports);
    return exports;
  }
  const {default:App}=load(resolve(root,'app/legal-office-app.tsx'));
  return renderToStaticMarkup(React.createElement(App,{guestMode:true,viewer:{email:'guest@example.invalid',displayName:'ضيف'},signInPath:'./',signOutPath:'./'}));
}
