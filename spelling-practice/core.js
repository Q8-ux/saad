/* Original center-line handwriting guides: one route of dots, not outlined type. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SpellingCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const WORDS=Object.freeze([
    {id:'hot',word:'hot',meaning:'حارّ'},
    {id:'sit',word:'sit',meaning:'يجلس'},
    {id:'ant',word:'ant',meaning:'نملة'},
    {id:'go',word:'go',meaning:'يذهب'},
    {id:'bag',word:'bag',meaning:'حقيبة'},
    {id:'cry',word:'cry',meaning:'يبكي'},
    {id:'garden',word:'garden',meaning:'حديقة'}
  ]);
  const GLYPHS=Object.freeze({
    a:{w:64,p:['M52 72C52 36 8 36 8 72C8 110 52 110 52 72','M52 46V100']},
    b:{w:64,p:['M10 12V100','M10 72C10 36 54 36 54 72C54 110 10 110 10 72']},
    c:{w:58,p:['M49 52C25 32 8 51 8 73C8 96 29 110 50 93']},
    d:{w:64,p:['M52 72C52 36 8 36 8 72C8 110 52 110 52 72','M52 12V100']},
    e:{w:60,p:['M8 72H51C52 35 8 35 8 72C8 99 34 111 53 93']},
    g:{w:64,p:['M52 72C52 36 8 36 8 72C8 110 52 110 52 72','M52 46V112C52 138 20 140 12 122']},
    h:{w:64,p:['M10 12V100','M10 69C10 38 53 35 53 66V100']},
    i:{w:30,p:['M14 47V100'],dot:[14,24]},
    n:{w:64,p:['M10 46V100','M10 69C10 38 53 35 53 66V100']},
    o:{w:64,p:['M32 44C0 44 0 101 32 101C64 101 64 44 32 44']},
    r:{w:46,p:['M10 46V100','M10 69C10 49 27 38 39 48']},
    s:{w:56,p:['M47 51C28 36 5 47 10 61C14 74 46 71 47 86C49 105 21 109 7 94']},
    t:{w:44,p:['M20 20V87C20 100 29 104 38 97','M6 47H37']},
    y:{w:64,p:['M7 46L31 100','M55 46L23 122C20 131 14 135 7 131']}
  });
  const COLORS=Object.freeze(['#1769aa','#17846e','#aa4b79']);
  const WIDTH=1000,HEIGHT=1170,STORAGE_KEY='checked-spelling-workbook-v1';
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  function wordLayout(word){
    const letters=[...word].map(c=>{if(!GLYPHS[c])throw new Error('Unsupported letter');return GLYPHS[c];});
    const width=letters.reduce((s,g)=>s+g.w,0)+(letters.length-1)*9;
    const scale=Math.min(2.65,880/width);
    return {letters,width,scale,x:(WIDTH-width*scale)/2};
  }
  function wordPaths(word,y,dotted=true){
    const layout=wordLayout(word);let x=0;
    const paths=layout.letters.map(g=>{const a=`<g transform="translate(${x} 0)">${g.p.map(d=>`<path d="${d}"/>`).join('')}${g.dot?`<circle cx="${g.dot[0]}" cy="${g.dot[1]}" r="2.1" fill="currentColor" stroke="none"/>`:''}</g>`;x+=g.w+9;return a;}).join('');
    return `<g transform="translate(${layout.x} ${y}) scale(${layout.scale})" fill="none" stroke="currentColor" stroke-width="${dotted?2.3:2.8}" stroke-linecap="round" stroke-linejoin="round"${dotted?' stroke-dasharray="0.01 6.3"':''}>${paths}</g>`;
  }
  function sheetSvg(word,mode='trace',print=false){
    const scale=wordLayout(word).scale;let content='';
    const labels=mode==='recall'?['Write from memory','Try again','One more time']:['Trace the dots','Trace again','Write on your own'];
    for(let i=0;i<3;i++){
      const top=i*390+37;
      content+=`<g fill="none" stroke="#d1ddd8" stroke-width="1.6"><path d="M38 ${top+12*scale}H962"/><path d="M38 ${top+46*scale}H962" stroke-dasharray="8 9"/><path d="M38 ${top+100*scale}H962" stroke="#94b9b3" stroke-width="2.4"/><path d="M38 ${top+136*scale}H962"/></g>`;
      content+=`<text x="39" y="${top-12}" fill="#64857e" font-family="Arial,sans-serif" font-size="21">${i+1} · ${labels[i]}</text>`;
      if(mode==='trace'&&i<2)content+=`<g color="${print?'#506966':'#8da6a0'}">${wordPaths(word,top)}</g>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Handwriting practice">${content}</svg>`;
  }
  function emptyState(){return {version:1,index:0,color:COLORS[0],mode:'trace',pages:{},completed:{}};}
  function normalizeState(raw){
    const state=emptyState();if(!raw||raw.version!==1)return state;
    state.index=clamp(Math.trunc(Number(raw.index)||0),0,WORDS.length-1);
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
  function printMarkup(words){return words.map((w,i)=>`<article class="print-sheet"><header class="print-meta"><span>MY SPELLING BOOK · GRADE 1</span><span>${i+1} / ${words.length}</span></header><h1>${w.word}</h1><p class="print-instruction">Read. Trace the dots. Write on your own.</p>${sheetSvg(w.word,'trace',true)}<footer><span>Name: ___________________</span><span>Date: ______________</span></footer></article>`).join('');}
  return {WORDS,GLYPHS,COLORS,WIDTH,HEIGHT,STORAGE_KEY,wordLayout,wordPaths,sheetSvg,emptyState,normalizeState,pointerPoint,pageKey,drawStroke,printMarkup};
});
