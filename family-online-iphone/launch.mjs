export const EDITOR_ROOT = 'https://q8-ux.github.io/saad/family-online-studio/';
export function assetURL(value) {
 const url=new URL(value,EDITOR_ROOT);
 if(url.origin!=='https://q8-ux.github.io'||url.username||url.password||!url.pathname.startsWith('/saad/family-online-studio/assets/'))throw Error('Unexpected editor asset');
 return url;
}
export function entryAssets(doc) {
 const styles=[...doc.querySelectorAll('link[rel="stylesheet"][href]')].map(node=>assetURL(node.getAttribute('href')));
 const scripts=[...doc.querySelectorAll('script[src]')].map(node=>({url:assetURL(node.getAttribute('src')),type:node.getAttribute('type')}));
 const config=scripts.find(item=>item.url.pathname.endsWith('/config.js'))?.url;
 const app=scripts.find(item=>item.type==='module'&&item.url.pathname.endsWith('/app.mjs'))?.url;
 if(!styles.length||!config||!app)throw Error('Incomplete editor entry');
 return {styles,config,app};
}

async function launch() {
 const button=document.getElementById('open-editor'),status=document.getElementById('launch-status'),panel=document.getElementById('installation');
 button.disabled=true;status.textContent='جارٍ فتح مساحة الكتابة…';
 try {
  const response=await fetch(new URL('index.html',EDITOR_ROOT),{cache:'no-store'});
  if(!response.ok)throw Error('Editor unavailable');
  const assets=entryAssets(new DOMParser().parseFromString(await response.text(),'text/html'));
  await Promise.all(assets.styles.map(url=>new Promise((resolve,reject)=>{
   const link=document.createElement('link');link.rel='stylesheet';link.href=url.href;link.onload=resolve;link.onerror=reject;document.head.append(link);
  })));
  await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=assets.config.href;script.onload=resolve;script.onerror=reject;document.head.append(script);});
  // The shared editor derives asset URLs from location; keep them on its canonical assets.
  Object.defineProperty(window,'__STUDIO_ASSET_BASE__',{configurable:true,get:()=>'/saad/family-online-studio/assets',set:()=>{}});
  await import(assets.app.href);
  panel.hidden=true;document.body.classList.remove('iphone-install');
 } catch {
  panel.hidden=false;button.disabled=false;status.textContent='تعذر تحميل المحرر. تحقق من الإنترنت ثم اضغط «فتح المحرر الآن».';
 }
}

if(typeof document!=='undefined') {
 document.getElementById('open-editor').addEventListener('click',launch);
 if(window.navigator.standalone===true||window.matchMedia('(display-mode: standalone)').matches)void launch();
}
