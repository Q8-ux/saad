#!/usr/bin/env node
import {readFileSync,statSync} from 'node:fs';
import {parseArgs} from 'node:util';
import {prepareSpec,importRecords,analyze,growthInsights} from './radar-core.mjs';
try {
  const {values:a}=parseArgs({options:{input:{type:'string'},query:{type:'string'},terms:{type:'string'},country:{type:'string',default:'KW'},platform:{type:'string',multiple:true},'post-url':{type:'string'},'include-unknown':{type:'boolean',default:false},'all-content':{type:'boolean',default:false},since:{type:'string'},until:{type:'string'}}});
  if(!a.input||!a.query)throw Error('Require --input and --query. Optional: --terms --country --platform --post-url --include-unknown --all-content --since --until.');
  if(statSync(a.input).size>2000000)throw Error('Input must be at most 2 MB.');
  const text=readFileSync(a.input,'utf8').replace(/^\uFEFF/,'');
  const data=a.input.endsWith('.jsonl')?text.split(/\r?\n/).filter(x=>x.trim()).map(x=>JSON.parse(x)):JSON.parse(text);
  const rows=Array.isArray(data)?data:(data.records||data.comments);
  if(!Array.isArray(rows))throw Error('Expected an array, comments/records array or JSONL.');
  const platforms=a.platform||[...new Set(rows.map(r=>r.platform).filter(Boolean))];
  if(!platforms.length)platforms.push('instagram');
  const spec=prepareSpec({query:a.query,terms:a.terms,country:a.country,platforms,includeUnknown:a['include-unknown'],requestsOnly:!a['all-content'],since:a.since,until:a.until});
  const records=importRecords(rows,platforms[0],a['post-url']||data.webpage_url).filter(r=>spec.platforms.includes(r.platform));
  const result=analyze(records,spec);
  console.log(JSON.stringify({scope:'imported_corpus_only',spec,...result,growthIdeas:growthInsights(result.results)},null,2));
} catch(e) {console.error(JSON.stringify({error:e.message}));process.exitCode=2;}
