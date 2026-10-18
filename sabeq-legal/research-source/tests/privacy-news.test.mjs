import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const js=path=>ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
function module(path,deps={}){const exports={};vm.runInNewContext(js(path),{exports,require:name=>deps[name]??require(name),Intl,Date});return exports;}
const storage=initial=>{const values=new Map(Object.entries(initial??{}));return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};};
test('policy preferences remove measurement identifiers and handle unavailable storage',()=>{
 const listeners={},status={textContent:'',dataset:{unset:'unset',disabled:'disabled',enabled:'enabled',restricted:'restricted',unavailable:'unavailable'}};
 const localStorage=storage({'sabeq-analytics-visitor':'synthetic','sabeq-session-token':'keep'}),sessionStorage=storage({'sabeq-analytics-session':'synthetic'});
 const buttons=['disable','enable'].map(choice=>({dataset:{analyticsChoice:choice},addEventListener:(_,fn)=>listeners[choice]=fn}));
 const document={getElementById:()=>status,querySelectorAll:()=>buttons};
 const window=new EventTarget();
 vm.runInNewContext(read('public/privacy.js'),{document,navigator:{},localStorage,sessionStorage,window});assert.equal(status.textContent,'unset');listeners.disable();
 assert.equal(localStorage.getItem('sabeq-analytics-consent'),'denied');
 assert.equal(status.textContent,'disabled');assert.equal(localStorage.getItem('sabeq-analytics-visitor'),null);assert.equal(sessionStorage.getItem('sabeq-analytics-session'),null);assert.equal(localStorage.getItem('sabeq-session-token'),'keep');
 listeners.enable();assert.equal(status.textContent,'enabled');assert.equal(localStorage.getItem('sabeq-analytics-consent'),'granted');
 vm.runInNewContext(read('public/privacy.js'),{document,navigator:{},localStorage:{getItem(){throw Error('blocked');}},sessionStorage,window});assert.equal(status.textContent,'unavailable');
});
test('footer policy links have local, readable routes for every site language',()=>{
 const notice=module('app/privacy-notice.tsx');
 for(const language of ['ar','en','ur']){
  const path=`privacy${language==='ar'?'':'-'+language}.html`,html=read('public/'+path);
  assert.match(html,new RegExp(`<html lang="${language}" dir="${language==='en'?'ltr':'rtl'}"`));
  assert.equal((html.match(/<section /g)||[]).length,10);assert.match(html,/mailto:info@sabeq.legal/);assert.doesNotMatch(html,/<(?:script|link)[^>]+(?:src|href)="https?:/);
  const rendered=renderToStaticMarkup(React.createElement(notice.PrivacyLink,{language}));assert.ok(rendered.includes(`./${path}`));assert.match(rendered,/target="_blank"/);
  if(language==='en')assert.doesNotMatch(rendered,/[\u0600-\u06ff]/);
 }
});
test('original news artwork is shown without repeated captions and retains judgment dates in its data',()=>{
 const data=module('app/group-news.ts'),artworks=module('app/group-post-artworks.ts');
 const posts=module('app/group-posts.ts',{'./group-news':data,'./group-post-artworks':artworks});
 assert.equal(data.groupNews.length,6);assert.equal(new Set(data.groupNews.map(n=>n.source)).size,6);
 assert.deepEqual(Array.from(data.groupNews,n=>n.id).sort(),['DdWSqBrg19a','Ddgy2L5geSN','DdoBZ65AguI','DbIv9QSgRzf','DaabrqsguOJ','DaYIFrmK8kH'].sort());
 assert.ok(data.groupNews.every(n=>n.kind==='case-result'&&n.eventDate));
 assert.deepEqual(Array.from(data.groupNews,n=>n.eventDate).sort(),['2026-06-24','2026-07-01','2026-07-22','2026-09-14','2026-09-20','2026-09-21']);
 assert.equal(posts.groupPosts.length,6);
 for(const post of posts.groupPosts){
  assert.ok(post.source.includes('/p/'));assert.equal(post.artwork.src,`/images/posts/${post.id}.jpg`);
  assert.ok(post.artwork.width>=480);assert.ok(post.artwork.height>=640);
  const bytes=readFileSync(new URL('../public'+post.artwork.src,import.meta.url));assert.equal(bytes[0],0xff);assert.equal(bytes[1],0xd8);assert.ok(bytes.length>1000);
 }
 const strip=module('app/group-posts-strip.tsx',{'./group-posts':posts,'../lib/runtime-urls':{assetUrl:path=>path}}).default;
 for(const language of ['ar','en','ur']){
  const html=renderToStaticMarkup(React.createElement(strip,{language}));
  const dates=[...html.matchAll(/<time dateTime="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(dates,[]);assert.doesNotMatch(html,/<h3|group-post-date/);
  assert.equal((html.match(/<article/g)||[]).length,6);assert.equal((html.match(/<img /g)||[]).length,6);
  assert.doesNotMatch(html,/<(?:img|iframe)[^>]+(?:src|srcset)="https?:/);assert.doesNotMatch(html,/2026-09-28|2026-09-23|2026-09-19|2026-09-16/);
  assert.match(html,/<dialog[^>]+aria-labelledby="group-post-dialog-title"/);
  for(const post of posts.groupPosts)assert.ok(html.includes(post.artwork.src));
  if(language==='en')assert.doesNotMatch(html,/[\u0600-\u06ff]/);
 }
 assert.equal(renderToStaticMarkup(React.createElement(strip,{language:'ar',posts:[]})),'');
});
test('post assets resolve locally on GitHub Pages and strip is placed below the video strip',()=>{
 const exports={};vm.runInNewContext(js('lib/runtime-urls.ts'),{exports,window:{location:{hostname:'q8-ux.github.io'}}});
 assert.equal(exports.assetUrl('/images/posts/example.jpg'),'/saad/sabeq-legal/images/posts/example.jpg');
 const site=read('app/sabeq-site.tsx');
 assert.ok(site.indexOf('<GroupPostsStrip')>site.indexOf('className="media-gallery"'));
 assert.ok(site.indexOf('<GroupPostsStrip')<site.indexOf('className="section why-section"'));
 assert.doesNotMatch(site,/GroupNewsTicker/);
});
