import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const m=JSON.parse(readFileSync('pages-dist/manifest.json','utf8'));const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
for(const [p,s]of Object.entries(m.sources))if(sha(p)!==s)throw Error('Source changed; rebuild GitHub Pages: '+p);
for(const [p,s]of Object.entries(m.assets))if(sha('pages-dist/'+p)!==s)throw Error('Built asset mismatch: '+p);
const html=readFileSync('pages-dist/index.html','utf8');if(!/src="\.\/assets\/radar-[^"]+\.js"/.test(html))throw Error('Relative page bundle is missing');
console.log('GitHub Pages source and asset integrity verified.');
