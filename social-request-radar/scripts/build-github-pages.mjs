import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,copyFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const result=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config','github-pages/vite.config.ts'],{stdio:'inherit'});if(result.status)process.exit(result.status);
copyFileSync('public/favicon.svg','pages-dist/favicon.svg');
const digest=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const sources=['lib/radar-core.mjs','app/radar.css','github-pages/index.html','github-pages/vite.config.ts','github-pages/source/main.tsx','github-pages/source/workspace.mjs','github-pages/source/search-state.mjs','github-pages/source/connector.mjs','github-pages/source/backend-config.mjs','github-pages/source/local.css','github-pages/source/radar-dashboard.tsx'];
const assets=['index.html','favicon.svg',...readdirSync('pages-dist/assets').map(x=>'assets/'+x)];
writeFileSync('pages-dist/manifest.json',JSON.stringify({sources:Object.fromEntries(sources.map(p=>[p,digest(p)])),assets:Object.fromEntries(assets.map(p=>[p,digest('pages-dist/'+p)]))},null,2)+'\n');
