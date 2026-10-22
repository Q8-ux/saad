/* Code-drawn lessons using the workbook's existing center-line letter models. */
(function(root,factory){const common=typeof module==='object'&&module.exports,core=common?require('./core.js'):root.SpellingCore,i18n=common?require('./i18n.js'):root.SpellingI18n;const api=factory(core,i18n);if(common)module.exports=api;else root.SpellingMotion=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C,I){
  'use strict';
  const WIDTH=1000,HEIGHT=760;
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

  function samplePath(path){
    const tokens=path.match(/[MLHVC]|-?(?:\d*\.\d+|\d+)/g)||[];
    if(tokens.join('')!==path.replace(/[\s,]/g,''))throw new Error('Unsupported guide path');
    const paths=[];let points=[],i=0,command='',x=0,y=0;
    const number=()=>{const token=tokens[i++],value=Number(token);if(token===undefined||!Number.isFinite(value))throw new Error('Invalid guide coordinate');return value;};
    const point=(a,b)=>{x=a;y=b;points.push({x,y});};
    while(i<tokens.length){
      if(/^[MLHVC]$/.test(tokens[i]))command=tokens[i++];
      if(command==='M'){if(points.length)paths.push(points);points=[];point(number(),number());command='L';}
      else if(command==='L')point(number(),number());
      else if(command==='H')point(number(),y);
      else if(command==='V')point(x,number());
      else if(command==='C'){
        const start={x,y},a={x:number(),y:number()},b={x:number(),y:number()},end={x:number(),y:number()};
        const count=clamp(Math.ceil((distance(start,a)+distance(a,b)+distance(b,end))/4),8,80);
        for(let n=1;n<=count;n++){const t=n/count,u=1-t;point(u*u*u*start.x+3*u*u*t*a.x+3*u*t*t*b.x+t*t*t*end.x,u*u*u*start.y+3*u*u*t*a.y+3*u*t*t*b.y+t*t*t*end.y);}
      }else throw new Error('Unknown guide command');
    }
    if(points.length)paths.push(points);
    return paths;
  }

  function buildPlan(word){
    if(!word||word.lang==='ar')return null;
    const text=word.trace||word.word,layout=C.wordLayout(text),illustrated=Boolean(word.picture||word.id==='garden'),y=illustrated?270:155;
    const strokes=[];let offset=0;
    for(const [index,glyph] of layout.letters.entries()){
      for(const path of glyph.p)for(const points of samplePath(path)){
        const actual=points.map(p=>({x:layout.x+(offset+p.x)*layout.scale,y:y+p.y*layout.scale}));
        const length=actual.slice(1).reduce((sum,p,i)=>sum+distance(actual[i],p),0);
        strokes.push({kind:'line',points:actual,length,letter:index});
      }
      if(glyph.dot)strokes.push({kind:'dot',x:layout.x+(offset+glyph.dot[0])*layout.scale,y:y+glyph.dot[1]*layout.scale,radius:2.1*layout.scale,length:12*layout.scale,letter:index});
      offset+=glyph.w+9;
    }
    return {id:word.id,title:text,meaning:word.meaning||'',picture:word.picture||'',illustrated,y,scale:layout.scale,strokes,length:strokes.reduce((sum,s)=>sum+s.length,0),duration:clamp([...text].length*1.15,6,16)};
  }

  function progressAt(seconds,duration){return clamp((seconds-.5)/Math.max(1,duration-1.75),0,1);}

  function drawGarden(ctx){
    ctx.save();ctx.translate(340,68);
    ctx.fillStyle='#e6f3f7';ctx.fillRect(0,0,320,172);
    ctx.fillStyle='#d8e7b7';ctx.fillRect(0,130,320,42);
    ctx.fillStyle='#e2cda2';ctx.fillRect(12,99,296,8);
    for(let i=0;i<12;i++)ctx.fillRect(16+i*25,84,7,50);
    ctx.fillStyle='#8e654b';ctx.fillRect(44,58,10,77);ctx.fillRect(269,66,9,69);
    for(const [x,y,r] of [[50,42,33],[31,62,25],[69,63,26],[274,54,28],[252,75,23],[291,75,22]]){ctx.beginPath();ctx.fillStyle='#4b9362';ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
    for(let i=0;i<5;i++){
      const x=100+i*30,y=120+(i%2)*15;
      ctx.strokeStyle='#377e53';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,160);ctx.lineTo(x,y);ctx.stroke();
      for(let j=0;j<5;j++){const angle=j*Math.PI*2/5;ctx.fillStyle=['#da7b75','#c68ab1','#e1a85b'][i%3];ctx.beginPath();ctx.arc(x+Math.cos(angle)*7,y+Math.sin(angle)*7,6,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#f4d88d';ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }

  function line(ctx,points,budget=Infinity){
    if(!points.length)return null;
    ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);let tip=points[0];
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],length=distance(a,b);
      if(budget<length){const fraction=length?budget/length:0;tip={x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction};ctx.lineTo(tip.x,tip.y);break;}
      ctx.lineTo(b.x,b.y);budget-=length;tip=b;
    }
    ctx.stroke();return tip;
  }

  function drawFrame(ctx,plan,progress,{picture,locale='ar'}={}){
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,WIDTH,HEIGHT);
    ctx.fillStyle='#fbfdf9';ctx.fillRect(0,0,WIDTH,HEIGHT);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.direction=locale==='en'?'ltr':'rtl';
    ctx.font='32px Tahoma, Arial, sans-serif';ctx.fillStyle='#234d48';ctx.fillText(I.t('videoTitle',locale),WIDTH/2,35);
    if(plan.id==='garden')drawGarden(ctx);
    else if(picture){
      const w=picture.naturalWidth||picture.width,h=picture.naturalHeight||picture.height,scale=Math.min(340/w,180/h);
      ctx.drawImage(picture,(WIDTH-w*scale)/2,68+(180-h*scale)/2,w*scale,h*scale);
    }
    ctx.strokeStyle='#d2e1da';ctx.lineWidth=2;
    for(const position of [46,100,136]){ctx.setLineDash(position===46?[8,9]:[]);ctx.beginPath();ctx.moveTo(44,plan.y+position*plan.scale);ctx.lineTo(956,plan.y+position*plan.scale);ctx.stroke();}
    ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=2.3*plan.scale;ctx.strokeStyle='#9ab8b0';ctx.fillStyle='#9ab8b0';ctx.setLineDash([.01,6.3*plan.scale]);
    for(const stroke of plan.strokes){if(stroke.kind==='line')line(ctx,stroke.points);else{ctx.beginPath();ctx.arc(stroke.x,stroke.y,stroke.radius,0,Math.PI*2);ctx.fill();}}
    ctx.setLineDash([]);ctx.lineWidth=3*plan.scale;ctx.strokeStyle='#176d69';ctx.fillStyle='#176d69';
    let budget=plan.length*clamp(progress,0,1),tip=null;
    for(const stroke of plan.strokes){
      if(budget<=0)break;
      if(stroke.kind==='line')tip=line(ctx,stroke.points,Math.min(budget,stroke.length));
      else{tip={x:stroke.x,y:stroke.y};ctx.beginPath();ctx.arc(stroke.x,stroke.y,stroke.radius*Math.min(1,budget/stroke.length),0,Math.PI*2);ctx.fill();}
      budget-=stroke.length;
    }
    if(tip&&progress<1){ctx.fillStyle='#b35136';ctx.beginPath();ctx.arc(tip.x,tip.y,9,0,Math.PI*2);ctx.fill();}
    const word=C.WORDS.find(w=>w.id===plan.id);
    ctx.font=(locale==='en'?'27':'34')+'px Tahoma, Arial, sans-serif';ctx.fillStyle='#234d48';ctx.fillText(word?I.meaning(word,locale):plan.meaning,WIDTH/2,710,900);
    ctx.fillStyle='#176d69';ctx.fillRect(50,742,900*clamp(progress,0,1),5);ctx.restore();
  }

  function recordingFormat(Recorder=globalThis.MediaRecorder){
    if(!Recorder?.isTypeSupported)return null;
    for(const [mimeType,extension] of [['video/mp4','mp4'],['video/webm;codecs=vp8,opus','webm'],['video/webm','webm']])if(Recorder.isTypeSupported(mimeType))return {mimeType,extension};
    return null;
  }

  async function recordLesson(canvas,plan,{audioUrl,picture,locale='ar',signal,audioContext,onProgress=()=>{}}={}){
    const format=recordingFormat(),Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!format||!Audio||!canvas.captureStream)throw new Error('unsupported');
    if(!/^audio\/[a-z]+\.mp3(?:\?v=\d+)?$/.test(audioUrl||''))throw new Error('audio');
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    const audio=audioContext||new Audio();let stream;const sources=[];
    try{
      // Resume directly inside the export tap; only the bundled clip enters the recording.
      const resumed=audioContext?Promise.resolve():audio.resume();
      const [response]=await Promise.all([fetch(audioUrl,{signal,credentials:'same-origin'}),resumed]);
      if(!response.ok)throw new Error('audio');
      const buffer=await audio.decodeAudioData(await response.arrayBuffer());
      if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
      if(document.hidden)throw new Error('hidden');
      const duration=Math.max(plan.duration,buffer.duration*2+1);
      if(!Number.isFinite(duration)||duration>30)throw new Error('audio');
      const destination=audio.createMediaStreamDestination();stream=canvas.captureStream(30);
      for(const track of destination.stream.getAudioTracks())stream.addTrack(track);
      return await new Promise((resolve,reject)=>{
        let recorder,frame=0,timer,failure;const chunks=[];
        const cleanup=()=>{cancelAnimationFrame(frame);clearTimeout(timer);signal?.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',visibility);};
        const stop=error=>{failure||=error;cancelAnimationFrame(frame);if(recorder?.state==='recording')recorder.stop();else{cleanup();reject(failure||new Error('recording'));}};
        const abort=()=>stop(new DOMException('Cancelled','AbortError'));
        const visibility=()=>{if(document.hidden)stop(new Error('hidden'));};
        try{
          recorder=new MediaRecorder(stream,{mimeType:format.mimeType,videoBitsPerSecond:3000000});
          recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
          recorder.onerror=()=>stop(new Error('recording'));
          recorder.onstop=()=>{cleanup();const blob=new Blob(chunks,{type:recorder.mimeType});if(failure||!blob.size)reject(failure||new Error('empty'));else resolve({blob,extension:recorder.mimeType.includes('mp4')?'mp4':'webm',duration});};
          signal?.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',visibility);
          drawFrame(canvas.getContext('2d'),plan,0,{picture,locale});recorder.start(250);
          const start=performance.now(),audioStart=audio.currentTime+.12;
          for(const delay of [0,Math.max(0,duration-buffer.duration-.25)]){const source=audio.createBufferSource();source.buffer=buffer;source.connect(destination);sources.push(source);source.start(audioStart+delay);}
          const tick=now=>{const elapsed=(now-start)/1000;drawFrame(canvas.getContext('2d'),plan,progressAt(elapsed,duration),{picture,locale});onProgress(Math.min(1,elapsed/duration));if(elapsed>=duration)stop();else frame=requestAnimationFrame(tick);};
          frame=requestAnimationFrame(tick);timer=setTimeout(()=>stop(new Error('timeout')),(duration+8)*1000);
        }catch(error){cleanup();reject(error);}
      });
    }finally{
      for(const source of sources){try{source.stop();}catch{}source.disconnect();}
      stream?.getTracks().forEach(track=>track.stop());if(audio.state!=='closed')await audio.close();
    }
  }

  return {WIDTH,HEIGHT,samplePath,buildPlan,progressAt,drawFrame,recordingFormat,recordLesson};
});
