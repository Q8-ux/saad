let sequence = 0;
const focusable = panel => [...panel.querySelectorAll('button, a[href], [tabindex="0"]')]
  .filter(node => !node.disabled && node.getAttribute('aria-disabled') !== 'true' && !node.closest('[hidden]') &&
    !node.matches('button[data-command-category]:not([data-command-selected])'));

export function mountCommandMenu(studio) {
  const panel = studio.querySelector('.topbar .top-actions');
  if (!panel) return null;
  const doc = studio.ownerDocument, id = 'studio-command-menu-' + (++sequence);
  const before = new Map(['id','role','aria-modal','aria-labelledby','tabindex','inert','data-command-drawer'].map(name => [name,panel.getAttribute(name)]));
  const make = (tag, name, content) => { const node=doc.createElement(tag);node.className=name;if(content)node.textContent=content;return node; };
  const trigger=make('button','studio-command-toggle'),icon=make('span','studio-command-icon','☰');
  const shortcuts=make('div','studio-quick-navigation');
  shortcuts.setAttribute('role','group');
  shortcuts.setAttribute('aria-label','التنقل السريع بالحساب');
  const worksButton=make('button','studio-quick-works','أعمالي');
  worksButton.type='button';
  worksButton.setAttribute('aria-label','أعمالي وتبديل المشاريع');
  const exitButton=make('button','studio-quick-logout','تسجيل الخروج');
  exitButton.type='button';
  exitButton.setAttribute('aria-label','تسجيل الخروج من الاستديو');
  shortcuts.append(worksButton,exitButton);
  const findWorks=()=>[...panel.querySelectorAll(':scope > button')]
    .find(button=>button.classList.contains('works-launch') || /^(المشاريع|أعمالي)$/.test(button.textContent.trim()));
  const findLogout=()=>[...panel.querySelectorAll(':scope > button')]
    .find(button=>/^(خروج|تسجيل الخروج)$/.test(button.textContent.trim()));
  const openWorks=()=>{
    const source=findWorks();
    if(source?.isConnected&&!source.disabled)source.click();
  };
  const signOut=()=>{
    const unsafe=studio.querySelector('.save-warning, .book-alert, .save-indicator.offline, .save-indicator.conflict, .save-indicator.saving, .status-save.offline, .status-save.conflict');
    if(unsafe&&doc.defaultView.confirm&&!doc.defaultView.confirm('قد توجد تعديلات لم تُحفظ. هل تريد تسجيل الخروج رغم ذلك؟'))return;
    const source=findLogout();
    if(source?.isConnected&&!source.disabled)source.click();
    else doc.defaultView.dispatchEvent(new Event('studio-sign-out'));
  };
  worksButton.addEventListener('click',openWorks);
  exitButton.addEventListener('click',signOut);
  icon.setAttribute('aria-hidden','true');trigger.type='button';trigger.dir='rtl';
  trigger.append(icon,make('span','','القائمة'));
  trigger.setAttribute('aria-label','فتح قائمة الأوامر');trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
  panel.id=panel.id||id;trigger.setAttribute('aria-controls',panel.id);
  panel.dataset.commandDrawer='true';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.tabIndex=-1;panel.inert=true;
  const header=make('div','studio-command-heading'),title=make('h2','','قائمة الأوامر'),closeButton=make('button','studio-command-close','×');
  title.id=id+'-title';closeButton.type='button';closeButton.setAttribute('aria-label','إغلاق قائمة الأوامر');
  header.append(title,closeButton);panel.setAttribute('aria-labelledby',title.id);
  const groups=[
    {id:'work',label:'الأعمال'},
    {id:'write',label:'الكتابة'},
    {id:'sections',label:'الأقسام'},
    {id:'voice',label:'الصوت'},
    {id:'files',label:'الملفات'},
    {id:'help',label:'المساعدة'},
  ];
  const groupBar=make('div','studio-command-groups');
  const emptyCategory=make('p','studio-command-empty','لا توجد أدوات في هذا القسم لهذا النوع من العمل.');
  emptyCategory.hidden=true;
  emptyCategory.setAttribute('role','status');
  groupBar.setAttribute('role','group');
  groupBar.setAttribute('aria-label','أقسام الأوامر');
  let selectedGroup='work';
  const groupButtons=new Map();
  for(const group of groups){
    const tab=make('button','studio-command-group',group.label);
    tab.type='button';
    tab.dataset.group=group.id;
    tab.setAttribute('aria-pressed',group.id===selectedGroup?'true':'false');
    tab.addEventListener('click',()=>{selectedGroup=group.id;updateGroups();panel.scrollTop=0;});
    groupButtons.set(group.id,tab);
    groupBar.append(tab);
  }
  const quickBar=make('div','studio-writing-quick-actions');
  quickBar.setAttribute('role','group');
  quickBar.setAttribute('aria-label','أدوات الكتابة والحفظ والتصدير');
  const quickSave=make('button','studio-writing-save','حفظ');
  const quickExport=make('button','studio-writing-export','تصدير PDF وWord');
  const quickTools=make('button','studio-writing-tools','أدوات الكتابة');
  const quickFormat=make('button','studio-writing-format','تنسيق النص');
  for(const button of [quickSave,quickExport,quickTools,quickFormat])button.type='button';
  quickExport.setAttribute('aria-haspopup','dialog');
  quickTools.setAttribute('aria-haspopup','dialog');
  quickSave.setAttribute('aria-label','حفظ التعديلات الآن');
  quickFormat.setAttribute('aria-expanded','false');
  quickBar.append(quickSave,quickExport,quickTools,quickFormat);
  const findExport=()=>panel.querySelector(':scope > .export-main, :scope > .book-save-export') ||
    [...panel.querySelectorAll(':scope > button')].find(button=>/^(تصدير|التصدير والاستيراد)$/.test(button.textContent.trim()));
  const findWritingTools=()=>[...panel.querySelectorAll(':scope > button')]
    .find(button=>button!==bookFormat&&button.textContent.trim()==='أدوات الكتابة');
  const activateSource=source=>{
    if(!source?.isConnected||source.disabled||source.getAttribute('aria-disabled')==='true')return false;
    source.click();return true;
  };
  const showWritingMenu=()=>{selectedGroup='write';updateGroups();open();};
  quickSave.addEventListener('click',()=>activateSource(saveSource));
  quickExport.addEventListener('click',()=>activateSource(findExport()));
  quickTools.addEventListener('click',()=>{if(!activateSource(findWritingTools()))showWritingMenu();});
  const currentToolbar=()=>studio.querySelector('.writing-canvas.view-script .editor-toolbar, .book-tools');
  const showFormat=()=>{
    const toolbar=currentToolbar(),toggle=toolbar?.previousElementSibling;
    if(!toolbar||!toggle?.classList.contains('studio-format-toggle')){showWritingMenu();return;}
    toggle.click();
    const expanded=toggle.getAttribute('aria-expanded')==='true';
    studio.classList.toggle('studio-quick-format-open',expanded);
    quickFormat.setAttribute('aria-expanded',String(expanded));
    quickFormat.setAttribute('aria-controls',toolbar.id);
    if(expanded)toolbar.scrollIntoView({block:'nearest',behavior:'smooth'});
  };
  quickFormat.addEventListener('click',()=>{
    const writingTab=[...studio.querySelectorAll('.viewbar .view-tabs > button')].find(button=>button.textContent.trim()==='الكتابة');
    if(!currentToolbar()&&activateSource(writingTab))doc.defaultView.requestAnimationFrame(()=>doc.defaultView.requestAnimationFrame(showFormat));
    else showFormat();
  });
  function syncQuickActions(){
    if(quickBar.parentElement!==studio)studio.querySelector('.topbar')?.after(quickBar);
    for(const [button,source] of [[quickSave,saveSource],[quickExport,findExport()]]){
      const disabled=!source?.isConnected||source.disabled||source.getAttribute('aria-disabled')==='true';
      if(button.disabled!==disabled)button.disabled=disabled;
    }
    const toolbar=currentToolbar(),toggle=toolbar?.previousElementSibling;
    const expanded=!!toolbar&&toggle?.classList.contains('studio-format-toggle')&&toggle.getAttribute('aria-expanded')==='true';
    if(quickFormat.getAttribute('aria-expanded')!==String(expanded))quickFormat.setAttribute('aria-expanded',String(expanded));
    if(toolbar?.id&&quickFormat.getAttribute('aria-controls')!==toolbar.id)quickFormat.setAttribute('aria-controls',toolbar.id);
  }
  const bookFormat=make('button','studio-command-book-format','Writer Toolbar | تنسيق الكتاب');
  bookFormat.type='button';
  bookFormat.dataset.commandGroup='write';
  const openBookFormat=()=>{
    const toolbar=studio.querySelector('.book-tools');
    const toggle=toolbar?.previousElementSibling;
    if(toggle?.classList.contains('studio-format-toggle')&&toggle.getAttribute('aria-expanded')!=='true')toggle.click();
    (toggle?.classList.contains('studio-format-toggle')?toggle:toolbar)?.scrollIntoView({block:'start',behavior:'smooth'});
  };
  bookFormat.addEventListener('click',openBookFormat);
  const sectionProxies=new Map();
  function syncSections(){
    const items=[...studio.querySelectorAll('.viewbar .view-tabs > button, .book-tools nav[aria-label="عرض الكتاب"] > button')];
    for(const [source,proxy] of sectionProxies){
      if(items.includes(source)&&source.isConnected)continue;
      proxy.remove();
      sectionProxies.delete(source);
    }
    for(const source of items){
      let proxy=sectionProxies.get(source);
      if(!proxy){
        proxy=make('button','studio-command-section');
        proxy.type='button';
        proxy.dataset.commandGroup='sections';
        proxy.addEventListener('click',()=>{if(source.isConnected&&!source.disabled)source.click();});
        panel.append(proxy);
        sectionProxies.set(source,proxy);
      }
      const label=source.textContent.trim()||source.getAttribute('aria-label')||'قسم';
      if(proxy.textContent!==label)proxy.textContent=label;
      proxy.disabled=source.disabled;
      proxy.setAttribute('aria-current',source.getAttribute('aria-current')||'false');
    }
  }
  function category(button){
    if(button.dataset.commandGroup)return button.dataset.commandGroup;
    const label=(button.getAttribute('aria-label')||button.textContent||'').trim();
    if(button.classList.contains('studio-command-save')||/حفظ|تصدير|طباعة|تنزيل|استيراد/.test(label))return 'files';
    if(/مشروع جديد|المشاريع|أعمالي|إدارة المشاريع|خروج|تسجيل الخروج/.test(label))return 'work';
    if(/صوت|استوديو الصوت|الميكروفون|الاستماع|تسجيل/.test(label))return 'voice';
    if(/مساعدة|اختصار|الإعدادات/.test(label))return 'help';
    return 'write';
  }
  function updateGroups(){
    if(disposed)return;
    for(const [id,tab] of groupButtons)tab.setAttribute('aria-pressed',id===selectedGroup?'true':'false');
    let matchCount=0;
    for(const button of panel.querySelectorAll(':scope > button')){
      const group=category(button);
      button.dataset.commandCategory=group;
      const visible=group===selectedGroup;
      button.toggleAttribute('data-command-selected',visible);
      if(visible)matchCount++;
    }
    groupBar.dataset.empty=matchCount?'false':'true';
    emptyCategory.hidden=matchCount>0;
  }
  const backdrop=make('div','studio-command-backdrop');backdrop.hidden=true;backdrop.setAttribute('aria-hidden','true');
  let opened=false,disposed=false,saveSource,saveProxy,signature='',inertNodes=[];
  function close(restoreFocus=true) {
    if(!opened)return;
    opened=false;panel.classList.remove('command-menu-open');panel.inert=true;studio.classList.remove('command-menu-open');
    backdrop.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-label','فتح قائمة الأوامر');
    panel.scrollTop=0;
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
    (groupButtons.get(selectedGroup)||closeButton).focus({preventScroll:true});
  }
  function sync() {
    if(disposed)return;
    studio.dataset.commandMenuReady='true';
    if(header.parentElement!==panel)panel.prepend(header);
    if(groupBar.parentElement!==panel)header.after(groupBar);
    if(emptyCategory.parentElement!==panel)groupBar.after(emptyCategory);
    if(studio.classList.contains('book-studio')) {
      if(bookFormat.parentElement!==panel)panel.append(bookFormat);
    } else bookFormat.remove();
    syncSections();
    const source=studio.querySelector('.save-controls .save-now, .book-tools .book-save');
    if(source!==saveSource) {
      saveSource?.classList.remove('studio-command-original-save');
      saveProxy?.remove();saveProxy=undefined;signature='';saveSource=source;
    }
    if(!source){syncQuickActions();updateGroups();return;}
    source.classList.add('studio-command-original-save');
    const next=source.outerHTML;
    if(next===signature&&saveProxy?.parentElement===panel){syncQuickActions();updateGroups();return;}
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
    syncQuickActions();updateGroups();
  }
  const toggle=()=>opened?close():open();
  const onCommand=event=>{
    const button=event.target.closest('button, a[href]');
    // Let React's delegated onClick handle the command before making its
    // parent inert. Closing during capture prevented some menu actions.
    if(button&&panel.contains(button)&&!button.disabled&&!button.closest('.studio-command-groups')){
      queueMicrotask(()=>{if(opened)close(false);});
    }
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
  doc.body.append(trigger,shortcuts);studio.append(backdrop);sync();
  return {panel,trigger,open,close,sync,destroy(){
    close(false);disposed=true;saveSource?.classList.remove('studio-command-original-save');
    saveProxy?.remove();
    for(const proxy of sectionProxies.values())proxy.remove();
    sectionProxies.clear();
    bookFormat.removeEventListener('click',openBookFormat);
    bookFormat.remove();
    emptyCategory.remove();groupBar.remove();header.remove();backdrop.remove();trigger.remove();
    worksButton.removeEventListener('click',openWorks);
    exitButton.removeEventListener('click',signOut);
    shortcuts.remove();
    quickBar.remove();studio.classList.remove('studio-quick-format-open');
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
  observer.observe(doc.getElementById('root')||doc.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','aria-disabled','aria-busy','aria-expanded']});
  scan();
  return ()=>{observer.disconnect();for(const state of mounted.values())state.destroy();mounted.clear();};
}
if(typeof document!=='undefined')startCommandMenus();
