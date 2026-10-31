let active;
const origin = location.origin;
function open() {
  if (!window.__STUDIO_SESSION__) return;
  if (active?.open) { active.focus(); return; }
  const work = (new URL(location.href).searchParams.get('work') || 'family-online').replace(/[^a-z0-9_-]/gi,'').slice(0,80);
  const title = document.querySelector('.project-name button')?.textContent?.trim() || 'مقطع من العمل';
  const dialog = document.createElement('dialog');dialog.className='vu-dialog';dialog.setAttribute('aria-label','مونتاج الفيديو');
  const header=document.createElement('header'),heading=document.createElement('strong'),close=document.createElement('button'),frame=document.createElement('iframe');
  heading.textContent='مونتاج الفيديو';close.type='button';close.textContent='إغلاق';
  frame.title='مونتاج تسجيلات العمل';frame.src=new URL('./video-use/index.html?profile=theatre&work='+encodeURIComponent(work),import.meta.url).href;
  frame.addEventListener('load',()=>frame.contentWindow.postMessage({type:'video-use-context',title},origin));
  header.append(heading,close);dialog.append(header,frame);document.body.append(dialog);active=dialog;
  const dispose=()=>{frame.src='about:blank';dialog.remove();if(active===dialog)active=null;};
  close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',dispose,{once:true});
  dialog.showModal();close.focus();
}
function attach() {
  const actions=document.querySelector('.top-actions');
  if(!actions||!window.__STUDIO_SESSION__||actions.querySelector('[data-video-use-launch]'))return;
  const button=document.createElement('button');button.type='button';button.className='button vu-launch';button.dataset.videoUseLaunch='true';button.textContent='مونتاج الفيديو';button.addEventListener('click',open);
  const works=actions.querySelector('.works-launch');if(works)works.after(button);else actions.append(button);
}
for(const event of ['studio-session-expired','studio-sign-out'])window.addEventListener(event,()=>active?.close());
new MutationObserver(attach).observe(document.getElementById('root')||document.body,{childList:true,subtree:true});
attach();
