(()=>{
  const el=id=>document.getElementById(id);
  const modal=el('settingsModal'),state=el('apiState');
  const getKeys=()=>({openai:sessionStorage.getItem('yt_openai')||'',youtube:sessionStorage.getItem('yt_youtube')||''});
  function paintState(){const k=getKeys();state.textContent=k.openai&&k.youtube?'الذكاء + YouTube متصلان':k.openai?'الذكاء متصل':k.youtube?'YouTube متصل':'الوضع المحلي';state.classList.toggle('ready',!!(k.openai||k.youtube))}
  el('settingsBtn').onclick=()=>{const k=getKeys();el('openaiKey').value=k.openai;el('youtubeKey').value=k.youtube;modal.classList.add('open')};
  el('closeSettings').onclick=()=>modal.classList.remove('open');modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open')};
  el('saveSettings').onclick=()=>{sessionStorage.setItem('yt_openai',el('openaiKey').value.trim());sessionStorage.setItem('yt_youtube',el('youtubeKey').value.trim());modal.classList.remove('open');paintState()};
  const originalGenerate=el('generate').onclick;
  el('generate').onclick=async()=>{
    const topic=el('topic').value.trim(),niche=el('niche').value.trim(),keyword=el('keyword').value.trim();
    if(!topic||!niche||!keyword){originalGenerate();return}
    const keys=getKeys();let market=null;
    setBusy(true,'جاري فحص الفكرة وبناء الحزمة…');
    try{
      if(keys.youtube) market=await analyzeYouTube(keyword,keys.youtube);
      if(keys.openai){const pack=await generateAI({topic,niche,keyword,audience:el('aud').value,format:el('format').value,duration:el('duration').value,proof:el('proof').value.trim(),market},keys.openai);showPack(pack,market)}
      else {originalGenerate();if(market)showMarket(market)}
    }catch(err){console.error(err);alert('تعذر الاتصال بالخدمة: '+friendly(err.message)+'\nسيتم استخدام التوليد المحلي.');originalGenerate();if(market)showMarket(market)}finally{setBusy(false)}
  };
  function setBusy(on,msg=''){const b=el('generate');b.disabled=on;b.textContent=on?msg:'توليد حزمة الفيديو الكاملة';b.style.opacity=on?'.72':'1'}
  async function analyzeYouTube(q,key){
    const s=await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&order=relevance&q=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`);if(!s.ok)throw new Error('مفتاح YouTube غير صالح أو الحصة اليومية منتهية');const sd=await s.json();
    const ids=sd.items.map(x=>x.id.videoId).join(',');if(!ids)return {videos:[],avgViews:0};
    const v=await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids}&key=${encodeURIComponent(key)}`);if(!v.ok)throw new Error('تعذر قراءة إحصاءات YouTube');const vd=await v.json();
    const videos=vd.items.map(x=>({title:x.snippet.title,channel:x.snippet.channelTitle,published:x.snippet.publishedAt,views:Number(x.statistics.viewCount||0),likes:Number(x.statistics.likeCount||0)}));
    return {videos,avgViews:Math.round(videos.reduce((a,x)=>a+x.views,0)/(videos.length||1)),topViews:Math.max(0,...videos.map(x=>x.views))};
  }
  async function generateAI(data,key){
    const compactMarket=data.market?data.market.videos.map(v=>({title:v.title,views:v.views,channel:v.channel})):[];
    const prompt=`أنت استراتيجي محتوى يوتيوب عربي. أنشئ حزمة دقيقة وطبيعية ولا تدّع ضمان التصدر. اجعل الكلمة المفتاحية منسجمة دون حشو. البيانات: ${JSON.stringify({...data,market:compactMarket})}. أعد JSON فقط بالمفاتيح العربية التالية: العنوان، الهوك والسيناريو، الوصف، الهاشتاقات والوسوم، برومبت الصورة، تدقيق الفكرة، درجة (رقم 0-100). السيناريو زمني ومناسب للمدة، وبرومبت الصورة بنسبة 16:9 ونصه العربي لا يتجاوز 4 كلمات. تدقيق الفكرة يفرق بين الحقائق والاستنتاجات ويذكر فجوة تنافسية مستندة للعناوين إن توفرت.`;
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model:'gpt-5-mini',input:prompt,text:{format:{type:'json_object'}}})});
    if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error?.message||'تعذر التوليد من OpenAI')};const d=await r.json();const txt=d.output_text||d.output?.flatMap(x=>x.content||[]).find(x=>x.text)?.text;if(!txt)throw new Error('لم تصل نتيجة قابلة للقراءة');return JSON.parse(txt);
  }
  function showPack(pack,market){
    current={};['العنوان','الهوك والسيناريو','الوصف','الهاشتاقات والوسوم','برومبت الصورة','تدقيق الفكرة'].forEach(k=>current[k]=pack[k]||'لم يتم توليد هذا القسم');active='العنوان';renderTabs();el('output').textContent=current[active];el('results').classList.add('show');el('score').textContent=Math.max(0,Math.min(100,Number(pack['درجة'])||80));el('c1').textContent='محللة';el('c2').textContent='مخصص';el('c3').textContent=el('proof').value.trim()?'متوفر':'يحتاج إثبات';el('c4').textContent='بالذكاء';el('mTitle').textContent=String(pack['العنوان']||'').length;
    save({topic:el('topic').value.trim(),niche:el('niche').value.trim(),key:el('keyword').value.trim(),title:pack['العنوان'],date:new Date().toLocaleDateString('ar-KW')});if(market)showMarket(market);el('results').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function showMarket(m){const box=el('competition'),list=el('videos');box.classList.add('show');list.innerHTML=`<div class="metrics"><div class="metric"><strong>${fmt(m.avgViews)}</strong><span>متوسط المشاهدات</span></div><div class="metric"><strong>${fmt(m.topViews)}</strong><span>أعلى نتيجة</span></div><div class="metric"><strong>${m.videos.length}</strong><span>نتائج محللة</span></div><div class="metric"><strong>فعلي</strong><span>مصدر YouTube</span></div></div>`+m.videos.map(v=>`<div class="video-row"><div><b>${safe(v.title)}</b><small>${safe(v.channel)} · ${new Date(v.published).toLocaleDateString('ar-KW')}</small></div><strong>${fmt(v.views)} مشاهدة</strong></div>`).join('')}
  const fmt=n=>new Intl.NumberFormat('ar-KW',{notation:'compact',maximumFractionDigits:1}).format(n||0);const safe=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));const friendly=s=>s.includes('Failed to fetch')?'تحقق من الاتصال أو صلاحية المفتاح':s;
  paintState();
})();
