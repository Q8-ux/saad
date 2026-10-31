let sequence = 0;
const focusable = panel => [...panel.querySelectorAll('button, a[href], [tabindex="0"]')]
  .filter(node => !node.disabled && node.getAttribute('aria-disabled') !== 'true' && !node.closest('[hidden]'));

export function mountCommandMenu(studio) {
  const panel = studio.querySelector('.topbar .top-actions');
  if (!panel) return null;
  const doc = studio.ownerDocument, id = 'studio-command-menu-' + (++sequence);
  const before = new Map(['id','role','aria-modal','aria-labelledby','tabindex','inert','data-command-drawer'].map(name => [name,panel.getAttribute(name)]));
  const make = (tag, name, content) => { const node=doc.createElement(tag);node.className=name;if(content)node.textContent=content;return node; };
  const trigger=make('button','studio-command-toggle'),icon=make('span','studio-command-icon','☰');
  icon.setAttribute('aria-hidden','true');trigger.type='button';trigger.dir='rtl';
  trigger.append(icon,make('span','','القائمة'));
  trigger.setAttribute('aria-label','فتح قائمة الأوامر');trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
  panel.id=panel.id||id;trigger.setAttribute('aria-controls',panel.id);
  panel.dataset.commandDrawer='true';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.tabIndex=-1;panel.inert=true;
  const header=make('div','studio-command-heading'),title=make('h2','','قائمة الأوامر'),closeButton=make('button','studio-command-close','×');
  title.id=id+'-title';closeButton.type='button';closeButton.setAttribute('aria-label','إغلاق قائمة الأوامر');
  header.append(title,closeButton);panel.setAttribute('aria-labelledby',title.id);
  const backdrop=make('div','studio-command-backdrop');backdrop.hidden=true;backdrop.setAttribute('aria-hidden','true');
  let opened=false,disposed=false,saveSource,saveProxy,signature='',inertNodes=[];
  function close(restoreFocus=true) {
    if(!opened)return;
    opened=false;panel.classList.remove('command-menu-open');panel.inert=true;studio.classList.remove('command-menu-open');
    backdrop.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-label','فتح قائمة الأوامر');
    for(const [node,value] of inertNodes)node.inert=value;inertNodes=[];
    if(restoreFocus&&trigger.isConnected)trigger.focus({preventScroll:true});
  }
  function open() {
    if(disposed||opened)return;
    sync();opened=true;
    for(const node of [...studio.children,...(panel.parentElement?.children||[])]) {
      if(node===panel||node===backdrop||node.contains(panel)||inertNodes.some(([item])=>item===node))continue;
      inertNodes.push([node,!!node.inert]);node.inert=true;
    }
    backdrop.hidden=false;panel.inert=false;panel.classList.add('command-menu-open');studio.classList.add('command-menu-open');
    trigger.setAttribute('aria-expanded','true');trigger.setAttribute('aria-label','إغلاق قائمة الأوامر');
    (focusable(panel).find(button=>button!==closeButton)||closeButton).focus({preventScroll:true});
  }
  function sync() {
    if(disposed)return;
    studio.dataset.commandMenuReady='true';
    if(header.parentElement!==panel)panel.prepend(header);
    const source=studio.querySelector('.save-controls .save-now, .book-tools .book-save');
    if(source!==saveSource) {
      saveSource?.classList.remove('studio-command-original-save');
      saveProxy?.remove();saveProxy=undefined;signature='';saveSource=source;
    }
    if(!source)return;
    source.classList.add('studio-command-original-save');
    const next=source.outerHTML;
    if(next===signature&&saveProxy?.parentElement===panel)return;
    signature=next;
    if(!saveProxy) {
      saveProxy=doc.createElement('button');saveProxy.type='button';
      saveProxy.addEventListener('click',()=>{if(saveSource?.isConnected&&!saveSource.disabled)saveSource.click();});
      panel.append(saveProxy);
    }
    saveProxy.className=source.className.replace('studio-command-original-save','')+' studio-command-save';
    saveProxy.replaceChildren(...[...source.childNodes].map(node=>node.cloneNode(true)));
    for(const node of saveProxy.querySelectorAll('[id]'))node.removeAttribute('id');
    saveProxy.disabled=source.disabled;
    saveProxy.setAttribute('aria-label',source.getAttribute('aria-label')||source.textContent.trim());
    if(source.hasAttribute('aria-busy'))saveProxy.setAttribute('aria-busy',source.getAttribute('aria-busy'));
    else saveProxy.removeAttribute('aria-busy');
  }
  const toggle=()=>opened?close():open();
  const onCommand=event=>{
    const button=event.target.closest('button, a[href]');
    if(button&&panel.contains(button)&&!button.disabled)close();
  };
  const onKey=event=>{
    if(!opened)return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
    if(event.key!=='Tab')return;
    const buttons=focusable(panel);if(!buttons.length){event.preventDefault();panel.focus();return;}
    const index=buttons.indexOf(doc.activeElement),next=event.shiftKey?(index<=0?buttons.length-1:index-1):(index<0||index===buttons.length-1?0:index+1);
    event.preventDefault();buttons[next].focus();
  };
  const onFocus=event=>{if(opened&&!panel.contains(event.target)&&event.target!==trigger)(focusable(panel)[0]||panel).focus();};
  trigger.addEventListener('click',toggle);backdrop.addEventListener('click',()=>close());closeButton.addEventListener('click',()=>close());
  panel.addEventListener('click',onCommand,true);doc.addEventListener('keydown',onKey,true);doc.addEventListener('focusin',onFocus);
  doc.body.append(trigger);studio.append(backdrop);sync();
  return {panel,trigger,open,close,sync,destroy(){
    close(false);disposed=true;saveSource?.classList.remove('studio-command-original-save');
    saveProxy?.remove();header.remove();backdrop.remove();trigger.remove();
    delete studio.dataset.commandMenuReady;studio.classList.remove('command-menu-open');
    for(const [name,value] of before)if(value===null)panel.removeAttribute(name);else panel.setAttribute(name,value);
    panel.removeEventListener('click',onCommand,true);doc.removeEventListener('keydown',onKey,true);doc.removeEventListener('focusin',onFocus);
  }};
}

export function startCommandMenus(doc=document) {
  const mounted=new Map();let queued=false;
  function scan() {
    queued=false;
    for(const [studio,state] of mounted)if(!studio.isConnected||studio.querySelector('.topbar .top-actions')!==state.panel){state.destroy();mounted.delete(studio);}
    for(const studio of doc.querySelectorAll('.studio')) {
      if(!mounted.has(studio)){const state=mountCommandMenu(studio);if(state)mounted.set(studio,state);}
      else mounted.get(studio).sync();
    }
  }
  const observer=new doc.defaultView.MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(scan);}});
  observer.observe(doc.getElementById('root')||doc.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','aria-disabled','aria-busy']});
  scan();
  return ()=>{observer.disconnect();for(const state of mounted.values())state.destroy();mounted.clear();};
}
if(typeof document!=='undefined')startCommandMenus();
