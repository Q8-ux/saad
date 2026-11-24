import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const source=await readFile(new URL('../embed.js',import.meta.url),'utf8');
function portal({path='/',query='',hash='',blockedStorage=false}={}){
 class Element{hidden=false;classes=new Set;classList={add:v=>this.classes.add(v),remove:v=>this.classes.delete(v)};}
 class Frame extends Element{src='';listeners={};sent=[];contentWindow={postMessage:(message,origin)=>this.sent.push({message,origin})};addEventListener(type,fn){this.listeners[type]=fn;}}
 const frame=new Frame,loader=new Element,link={href:''},retry={addEventListener(){}},listeners={},changes=[];
 let location=new URL('https://q8-ux.github.io/saad/ant-alshaer/'+(path==='/'?'':path.slice(1)+'/')+query+hash);
 const window={get location(){return location;},clearTimeout(){},setTimeout(){return 1;},addEventListener:(type,fn)=>listeners[type]=fn,history:{pushState:(_a,_b,next)=>{changes.push(next);location=new URL(next,location);},replaceState:(_a,_b,next)=>{location=new URL(next,location);}}};
 runInNewContext(source,{window,document:{body:{dataset:{appPath:path}},querySelector:name=>({'.site-frame':frame,'.loading-shell':loader,'.retry':retry,'.open-app':link})[name]},sessionStorage:{getItem(){if(blockedStorage)throw Error('storage disabled');return null;},removeItem(){}},HTMLIFrameElement:Frame,HTMLElement:Element,URL,Set,Date,Blob});
 return {frame,loader,link,listeners,changes};
}
test('loading a sign-in/error frame never hides the first-party entry link',()=>{
 const p=portal();p.frame.listeners.load();assert.equal(p.loader.hidden,false);assert.equal(p.link.href,'https://abyat-alshier.centrino.chatgpt.site/');assert.equal(p.frame.sent[0].message.type,'app-ready-check');
});
test('only the application bridge may acknowledge readiness',()=>{
 const p=portal(),data={channel:'ant-alshaer-navigation',type:'route-changed',pathname:'/'};
 for(const event of [{origin:'https://evil.invalid',source:p.frame.contentWindow,data},{origin:'https://abyat-alshier.centrino.chatgpt.site',source:{},data},{origin:'https://abyat-alshier.centrino.chatgpt.site',source:p.frame.contentWindow,data:{...data,pathname:'/foreign'}}]){p.listeners.message(event);assert.equal(p.loader.hidden,false);}
 p.listeners.message({origin:'https://abyat-alshier.centrino.chatgpt.site',source:p.frame.contentWindow,data});assert.equal(p.loader.hidden,true);
 p.frame.listeners.load();assert.equal(p.loader.hidden,false,'a new load requires a fresh readiness acknowledgment');
});
test('first-party destinations preserve supported routes, query and section',()=>{
 for(const path of ['/','/archive','/login','/admin','/admin/login']){const p=portal({path,query:'?entry=mobile',hash:'#story'});assert.equal(p.link.href,'https://abyat-alshier.centrino.chatgpt.site'+path+'?entry=mobile#story');}
 const p=portal({path:'https://evil.invalid'});assert.equal(new URL(p.link.href).origin,'https://abyat-alshier.centrino.chatgpt.site');
});
test('blocked browser storage cannot prevent the application from loading',()=>{
 const p=portal({blockedStorage:true});assert.equal(p.frame.src,'https://abyat-alshier.centrino.chatgpt.site/');
});
test('every entry page has a usable first-party link before JavaScript runs',async()=>{
 for(const path of ['index.html','archive/index.html','login/index.html','admin/index.html','admin/login/index.html']){
  const html=await readFile(new URL('../'+path,import.meta.url),'utf8');assert.match(html,/<a class="open-app" href="https:\/\/abyat-alshier\.centrino\.chatgpt\.site/);assert.match(html,/target="_blank" rel="noopener"/);assert.match(html,/embed\.js\?v=20261124-entry1/);
 }
});
