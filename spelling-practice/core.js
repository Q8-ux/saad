/* Original center-line handwriting guides: one route of dots, not outlined type. */
(function(root,factory){const guides=typeof module==='object'&&module.exports?require('./arabic-guides.js'):root.SpellingArabicGuides;const api=factory(guides);if(typeof module==='object'&&module.exports)module.exports=api;else root.SpellingCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(ARABIC_GUIDES){
  'use strict';
  const WORDS=Object.freeze([
    {id:'hot',word:'hot',meaning:'حارّ'},
    {id:'sit',word:'sit',meaning:'يجلس'},
    {id:'ant',word:'ant',meaning:'نملة'},
    {id:'go',word:'go',meaning:'يذهب'},
    {id:'bag',word:'bag',meaning:'حقيبة'},
    {id:'cry',word:'cry',meaning:'يبكي'},
    {id:'garden',word:'garden',meaning:'حديقة'},
    {id:'down',word:'down',meaning:'أسفل'},
    {id:'left',word:'left',meaning:'يسار'},
    {id:'play',word:'play',meaning:'يلعب'},
    {id:'kind',word:'kind',meaning:'لطيف'},
    {id:'read',word:'read',meaning:'يقرأ'},
    {id:'sleep',word:'sleep',meaning:'ينام'},
    {id:'wash',word:'wash',meaning:'يغسل'},
    {id:'creeper',word:'creeper',meaning:'نبات زاحف'},
    {id:'climber',word:'climber',meaning:'نبات متسلّق'},
    {id:'buds',word:'buds',meaning:'براعم'},
    {id:'energy',word:'energy',meaning:'طاقة'},
    {id:'grow',word:'grow',meaning:'ينمو'},
    {id:'plants',word:'plants',meaning:'نباتات'},
    {id:'air',word:'air',meaning:'هواء'},
    {id:'animals',word:'animals',meaning:'حيوانات'},
    {id:'sunlight',word:'sunlight',meaning:'ضوء الشمس'},
    {id:'soil',word:'soil',meaning:'تربة'},
    {id:'water',word:'water',meaning:'ماء'},
    {id:'flower',word:'flower',meaning:'زهرة'},
    {id:'leaf',word:'leaf',meaning:'ورقة نبات'},
    {id:'healthy',word:'healthy',meaning:'صحيّ'},
    {id:'apple',word:'apple',meaning:'تفاحة'},
    {id:'orange',word:'orange',meaning:'برتقالة'},
    {id:'carrot',word:'carrot',meaning:'جزرة'},
    {id:'potato',word:'potato',meaning:'بطاطا'},
    {id:'pilot',word:'pilot',meaning:'طيّار'},
    {id:'nurse',word:'nurse',meaning:'ممرّض / ممرّضة'},
    {id:'chef',word:'chef',meaning:'طاهٍ'},
    {id:'kuwait',word:'Kuwait',meaning:'الكويت'},
    {id:'parents',word:'parents',meaning:'الوالدان'},
    {id:'children',word:'children',meaning:'أطفال'},
    {id:'soap',word:'soap',meaning:'صابون'},
    {id:'comb',word:'comb',meaning:'مشط'},
    {id:'learn',word:'learn',meaning:'يتعلّم'},
    {id:'ardaras',word:'دَرَسَ',meaning:'دَ · رَ · سَ',lang:'ar'},
    {id:'arsaad',word:'صَعَدَ',meaning:'صَ · عَ · دَ',lang:'ar'},
    {id:'arkhatar',word:'خَطَرَ',meaning:'خَ · طَ · رَ',lang:'ar'},
    {id:'aratas',word:'عَطَسَ',meaning:'عَ · طَ · سَ',lang:'ar'},
    {id:'arshaar',word:'شَعَرَ',meaning:'شَ · عَ · رَ',lang:'ar'},
    {id:'arsataa',word:'سَطَعَ',meaning:'سَ · طَ · عَ',lang:'ar'},
    {id:'arkhadaa',word:'خَدَعَ',meaning:'خَ · دَ · عَ',lang:'ar'},
    {id:'arzaraa',word:'زَرَعَ',meaning:'زَ · رَ · عَ',lang:'ar'},
    {id:'numone',word:'One',trace:'1 = One',number:1,meaning:'واحد'},
    {id:'numtwo',word:'Two',trace:'2 = Two',number:2,meaning:'اثنان'},
    {id:'numthree',word:'Three',trace:'3 = Three',number:3,meaning:'ثلاثة'},
    {id:'numfour',word:'Four',trace:'4 = Four',number:4,meaning:'أربعة'},
    {id:'numfive',word:'Five',trace:'5 = Five',number:5,meaning:'خمسة'},
    {id:'numsix',word:'Six',trace:'6 = Six',number:6,meaning:'ستة'},
    {id:'numseven',word:'Seven',trace:'7 = Seven',number:7,meaning:'سبعة'},
    {id:'numeight',word:'Eight',trace:'8 = Eight',number:8,meaning:'ثمانية'},
    {id:'numnine',word:'Nine',trace:'9 = Nine',number:9,meaning:'تسعة'},
    {id:'numten',word:'Ten',trace:'10 = Ten',number:10,meaning:'عشرة'}
  ]);
  const SUBJECTS=Object.freeze([
    {id:'english',label:'الإنجليزي',ids:['hot','sit','ant','garden','go','bag','cry','down','left','play','kind','read','sleep','wash']},
    {id:'science',label:'العلوم',ids:['creeper','climber','buds','energy','grow','plants','air','animals','sunlight','soil','water','flower','leaf','healthy']},
    {id:'social',label:'الاجتماعيات',ids:['apple','orange','carrot','potato','pilot','nurse','chef','kuwait','parents','children','soap','water','comb','learn']},
    {id:'arabic',label:'العربي',ids:['ardaras','arsaad','arkhatar','aratas','arshaar','arsataa','arkhadaa','arzaraa']},
    {id:'numbers',label:'الأعداد',ids:['numone','numtwo','numthree','numfour','numfive','numsix','numseven','numeight','numnine','numten']}
  ]);
  function subjectWords(id){return (SUBJECTS.find(s=>s.id===id)||SUBJECTS[0]).ids.map(id=>WORDS.find(w=>w.id===id));}
  function subjectForWord(id,preferred='english'){return SUBJECTS.find(s=>s.id===preferred&&s.ids.includes(id))?.id||SUBJECTS.find(s=>s.ids.includes(id))?.id||'english';}
  const GLYPHS=Object.freeze({
    ' ':{w:30,p:[]},
    '=':{w:60,p:['M6 55H54','M6 77H54']},
    '0':{w:64,p:['M32 12C0 12 0 100 32 100C64 100 64 12 32 12']},
    '1':{w:46,p:['M8 34L26 12V100','M8 100H42']},
    '2':{w:64,p:['M9 32C10 3 54 6 54 32C54 51 10 76 8 100H56']},
    '3':{w:64,p:['M9 22C34 0 62 17 49 42C44 51 36 54 25 54','M25 54C65 49 69 105 28 102C20 101 12 98 7 90']},
    '4':{w:68,p:['M47 12L7 72H61','M47 12V100']},
    '5':{w:64,p:['M54 12H14L10 53C29 41 54 50 55 75C57 106 21 109 7 94']},
    '6':{w:64,p:['M51 16C22 1 5 40 7 74C9 111 57 111 57 76C57 42 9 44 7 74']},
    '7':{w:64,p:['M7 12H57L23 100']},
    '8':{w:64,p:['M32 12C3 12 3 52 32 54C65 56 65 103 32 103C-1 103-1 56 32 54C61 52 61 12 32 12']},
    '9':{w:64,p:['M56 39C56 2 8 2 8 39C8 74 56 74 56 39C59 75 39 113 12 97']},
    E:{w:64,p:['M57 12H10V100H57','M10 54H50']},
    F:{w:64,p:['M10 100V12H57','M10 54H50']},
    K:{w:76,p:['M12 12V100','M66 12L12 61','M30 45L68 100']},
    N:{w:76,p:['M10 100V12L66 100V12']},
    O:{w:76,p:['M38 12C-3 12-3 100 38 100C79 100 79 12 38 12']},
    S:{w:70,p:['M61 24C30-8 0 22 17 44C28 58 61 54 61 78C61 106 26 114 7 90']},
    T:{w:72,p:['M5 12H67','M36 12V100']},
    a:{w:64,p:['M52 72C52 36 8 36 8 72C8 110 52 110 52 72','M52 46V100']},
    b:{w:64,p:['M10 12V100','M10 72C10 36 54 36 54 72C54 110 10 110 10 72']},
    c:{w:58,p:['M49 52C25 32 8 51 8 73C8 96 29 110 50 93']},
    d:{w:64,p:['M52 72C52 36 8 36 8 72C8 110 52 110 52 72','M52 12V100']},
    e:{w:60,p:['M8 72H51C52 35 8 35 8 72C8 99 34 111 53 93']},
    f:{w:48,p:['M39 15C24 5 16 18 16 34V100','M4 47H36']},
    g:{w:64,p:['M52 72C52 36 8 36 8 72C8 110 52 110 52 72','M52 46V112C52 138 20 140 12 122']},
    h:{w:64,p:['M10 12V100','M10 69C10 38 53 35 53 66V100']},
    i:{w:30,p:['M14 47V100'],dot:[14,24]},
    k:{w:60,p:['M10 12V100','M50 46L10 80','M29 64L53 100']},
    l:{w:30,p:['M14 12V100']},
    m:{w:96,p:['M10 46V100','M10 69C10 38 48 35 48 66V100','M48 69C48 38 86 35 86 66V100']},
    n:{w:64,p:['M10 46V100','M10 69C10 38 53 35 53 66V100']},
    o:{w:64,p:['M32 44C0 44 0 101 32 101C64 101 64 44 32 44']},
    p:{w:64,p:['M10 46V134','M10 72C10 36 54 36 54 72C54 110 10 110 10 72']},
    r:{w:46,p:['M10 46V100','M10 69C10 49 27 38 39 48']},
    s:{w:56,p:['M47 51C28 36 5 47 10 61C14 74 46 71 47 86C49 105 21 109 7 94']},
    t:{w:44,p:['M20 20V87C20 100 29 104 38 97','M6 47H37']},
    u:{w:64,p:['M10 46V80C10 108 53 108 53 79V46','M53 79V100']},
    v:{w:64,p:['M6 46L32 100L58 46']},
    w:{w:88,p:['M6 46L22 100L44 55L64 100L82 46']},
    x:{w:64,p:['M8 46L56 100','M56 46L8 100']},
    y:{w:64,p:['M7 46L31 100','M55 46L23 122C20 131 14 135 7 131']}
  });
  const COLORS=Object.freeze(['#1769aa','#17846e','#aa4b79']);
  const WIDTH=1000,HEIGHT=1170,STORAGE_KEY='checked-spelling-workbook-v1';
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  function wordLayout(word){
    if(ARABIC_GUIDES[word]){const width=ARABIC_GUIDES[word].width,scale=Math.min(2.65,880/width);return {letters:[],width,scale,x:(WIDTH-width*scale)/2};}
    const letters=[...word].map(c=>{if(!GLYPHS[c])throw new Error('Unsupported letter');return GLYPHS[c];});
    const width=letters.reduce((s,g)=>s+g.w,0)+(letters.length-1)*9;
    const scale=Math.min(2.65,880/width);
    return {letters,width,scale,x:(WIDTH-width*scale)/2};
  }
  function wordPaths(word,y,dotted=true){
    const layout=wordLayout(word);let x=0;
    if(ARABIC_GUIDES[word])return `<g data-guide="arabic" transform="translate(${layout.x} ${y}) scale(${layout.scale})">${ARABIC_GUIDES[word].markup}</g>`;
    const paths=layout.letters.map(g=>{const a=`<g transform="translate(${x} 0)">${g.p.map(d=>`<path d="${d}"/>`).join('')}${g.dot?`<circle cx="${g.dot[0]}" cy="${g.dot[1]}" r="2.1" fill="currentColor" stroke="none"/>`:''}</g>`;x+=g.w+9;return a;}).join('');
    return `<g transform="translate(${layout.x} ${y}) scale(${layout.scale})" fill="none" stroke="currentColor" stroke-width="${dotted?2.3:2.8}" stroke-linecap="round" stroke-linejoin="round"${dotted?' stroke-dasharray="0.01 6.3"':''}>${paths}</g>`;
  }
  function sheetSvg(word,mode='trace',print=false){
    const scale=wordLayout(word).scale,arabic=Boolean(ARABIC_GUIDES[word]);let content='';
    const labels=arabic?(mode==='recall'?['أكتب من الذاكرة','أحاول مرة أخرى','أعيد الكتابة']:['أتتبّع النقاط','أعيد المحاولة','أكتب وحدي']):(mode==='recall'?['Write from memory','Try again','One more time']:['Trace the dots','Trace again','Write on your own']);
    for(let i=0;i<3;i++){
      const top=i*390+37;
      content+=`<g fill="none" stroke="#d1ddd8" stroke-width="1.6"><path d="M38 ${top+12*scale}H962"/><path d="M38 ${top+46*scale}H962" stroke-dasharray="8 9"/><path d="M38 ${top+100*scale}H962" stroke="#94b9b3" stroke-width="2.4"/><path d="M38 ${top+136*scale}H962"/></g>`;
      content+=`<text x="${arabic?960:39}" y="${top-12}"${arabic?' direction="rtl" text-anchor="start"':''} fill="#64857e" font-family="Arial,Tahoma,sans-serif" font-size="21">${i+1} · ${labels[i]}</text>`;
      if(mode==='trace'&&i<2)content+=`<g color="${print?'#506966':'#8da6a0'}">${wordPaths(word,top)}</g>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Handwriting practice">${content}</svg>`;
  }
  function emptyState(){return {version:1,index:0,subject:'english',color:COLORS[0],mode:'trace',pages:{},completed:{}};}
  function normalizeState(raw){
    const state=emptyState();if(!raw||raw.version!==1)return state;
    state.index=clamp(Math.trunc(Number(raw.index)||0),0,WORDS.length-1);
    state.subject=subjectForWord(WORDS[state.index].id,raw.subject);
    if(COLORS.includes(raw.color))state.color=raw.color;
    if(raw.mode==='recall')state.mode='recall';
    for(const {id} of WORDS){
      if(raw.completed?.[id]===true)state.completed[id]=true;
      for(const mode of ['trace','recall']){
        const key=id+':'+mode,strokes=raw.pages?.[key];if(!Array.isArray(strokes))continue;
        let count=0;
        state.pages[key]=strokes.slice(0,1500).filter(s=>s&&Array.isArray(s.points)).map(s=>({
          tool:s.tool==='eraser'?'eraser':'pen',color:COLORS.includes(s.color)?s.color:COLORS[0],
          width:clamp(Number(s.width)||9,1,50),
          points:s.points.slice(0,20000).filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&++count<=30000).map(p=>({x:clamp(p.x,0,WIDTH),y:clamp(p.y,0,HEIGHT),p:clamp(Number(p.p)||.5,.1,1)}))
        })).filter(s=>s.points.length);
      }
    }
    return state;
  }
  function pointerPoint(event,rect){return {x:Math.round(clamp((event.clientX-rect.left)/rect.width*WIDTH,0,WIDTH)*10)/10,y:Math.round(clamp((event.clientY-rect.top)/rect.height*HEIGHT,0,HEIGHT)*10)/10,p:Math.round((event.pointerType==='pen'&&event.pressure>0?clamp(event.pressure,.1,1):.5)*100)/100};}
  function pageKey(state){return WORDS[state.index].id+':'+state.mode;}
  function drawStroke(ctx,s,from=0){
    ctx.save();ctx.globalCompositeOperation=s.tool==='eraser'?'destination-out':'source-over';ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.lineCap='round';ctx.lineJoin='round';
    if(s.points.length===1){const p=s.points[0];ctx.beginPath();ctx.arc(p.x,p.y,s.width*(.65+p.p*.7)/2,0,Math.PI*2);ctx.fill();}
    for(let i=Math.max(1,from);i<s.points.length;i++){const a=s.points[i-1],b=s.points[i];ctx.lineWidth=s.width*(.65+(a.p+b.p)*.35);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}ctx.restore();
  }
  function printMarkup(words){return words.map((w,i)=>`<article class="print-sheet${w.lang==='ar'?' arabic-sheet':''}"><header class="print-meta"><span>MY SPELLING BOOK · GRADE 1</span><span>${i+1} / ${words.length}</span></header><h1${w.lang==='ar'?' dir="rtl" lang="ar"':''}>${w.trace||w.word}</h1><p class="print-instruction"${w.lang==='ar'?' dir="rtl"':''}>${w.lang==='ar'?'أقرأ الكلمة، أتتبّع النقاط، ثم أكتب بنفسي.':'Read. Trace the dots. Write on your own.'}</p>${sheetSvg(w.trace||w.word,'trace',true)}<footer><span>Name: ___________________</span><span>Date: ______________</span></footer></article>`).join('');}
  return {WORDS,SUBJECTS,subjectWords,subjectForWord,GLYPHS,COLORS,WIDTH,HEIGHT,STORAGE_KEY,wordLayout,wordPaths,sheetSvg,emptyState,normalizeState,pointerPoint,pageKey,drawStroke,printMarkup};
});
