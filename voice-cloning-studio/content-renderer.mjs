function textLines(ctx,text,maxWidth){
  const lines=[];let line='';
  for(const word of text.split(/\s+/u)){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;}
  if(line)lines.push(line);return lines;
}
export function paintContent(canvas,plan,images,time){
  const ctx=canvas.getContext('2d'),{width:w,height:h}=canvas;
  const index=Math.min(plan.scenes.length-1,Math.floor(Math.max(0,time)/plan.duration*plan.scenes.length));
  const scene=plan.scenes[index],image=images[index],phase=Math.max(0,Math.min(1,(time-scene.start)/(scene.end-scene.start)));
  ctx.fillStyle='#100b1e';ctx.fillRect(0,0,w,h);
  const scale=Math.max(w/image.naturalWidth,h/image.naturalHeight)*(1+phase*.045);
  const iw=image.naturalWidth*scale,ih=image.naturalHeight*scale;
  ctx.drawImage(image,(w-iw)/2,(h-ih)/2,iw,ih);
  const top=ctx.createLinearGradient(0,0,0,h*.3);top.addColorStop(0,'#100b1ee8');top.addColorStop(1,'#100b1e00');
  ctx.fillStyle=top;ctx.fillRect(0,0,w,h*.3);
  ctx.direction='rtl';ctx.textAlign='right';ctx.textBaseline='top';ctx.fillStyle='#ffffff';
  ctx.font=`bold ${Math.round(w*.05)}px Mohannad, Tahoma, sans-serif`;
  ctx.fillText('قصص و روايات',w*.94,h*.035,w*.88);
  const words=scene.text.split(/\s+/u),pages=Math.max(1,Math.ceil(words.length/10));
  const page=Math.min(pages-1,Math.floor(phase*pages));
  const caption=words.slice(page*10,(page+1)*10).join(' ');
  ctx.font=`bold ${Math.round(w*.052)}px Mohannad, Tahoma, sans-serif`;
  const lines=textLines(ctx,caption,w*.84),lineHeight=w*.076,pad=w*.04;
  const boxHeight=lines.length*lineHeight+pad*2,boxTop=h*.9-boxHeight;
  if(caption){ctx.fillStyle='#100b1ed9';ctx.fillRect(w*.04,boxTop,w*.92,boxHeight);ctx.fillStyle='#ffffff';lines.forEach((line,n)=>ctx.fillText(line,w*.92,boxTop+pad+n*lineHeight,w*.84));}
}

export function contentMime(){
  if(!globalThis.MediaRecorder)return '';
  return ['video/mp4;codecs=avc1.424028,mp4a.40.2','video/webm;codecs=vp8,opus','video/webm'].find(type=>MediaRecorder.isTypeSupported(type))||'';
}

export async function renderContent(canvas,plan,images,audioBuffer,{signal,onProgress=()=>{}}={}){
  const type=contentMime();
  if(!type||!canvas.captureStream)throw new Error('هذا المتصفح لا يدعم تصدير الفيديو المحلي. استخدم حزمة MoneyPrinterTurbo على الكمبيوتر.');
  if(signal?.aborted)throw new DOMException('Export cancelled','AbortError');
  await document.fonts.ready;
  const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
  const audio=new Audio(),destination=audio.createMediaStreamDestination(),source=audio.createBufferSource();
  let recorder,stream,raf,finishTimer;
  const visibility=()=>{if(document.hidden)stop();};
  let stop=()=>{};
  try{
    await audio.resume();
    source.buffer=audioBuffer;source.connect(destination);
    canvas.width=plan.width;canvas.height=plan.height;paintContent(canvas,plan,images,0);
    const visual=canvas.captureStream(plan.fps);
    stream=new MediaStream([...visual.getVideoTracks(),...destination.stream.getAudioTracks()]);
    recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:2500000,audioBitsPerSecond:128000});
    const chunks=[];
    const blob=await new Promise((resolve,reject)=>{
      let stopped=false;
      stop=()=>{if(stopped)return;stopped=true;try{source.stop();}catch{}if(recorder.state!=='inactive')recorder.stop();};
      const cancel=()=>stop();
      signal?.addEventListener('abort',cancel,{once:true});
      document.addEventListener('visibilitychange',visibility);
      recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      recorder.onerror=()=>{stop();reject(new Error('تعذّر ترميز الفيديو في هذا المتصفح.'));};
      recorder.onstop=()=>{
        signal?.removeEventListener('abort',cancel);
        if(signal?.aborted||document.hidden){reject(new DOMException('Export cancelled','AbortError'));return;}
        const result=new Blob(chunks,{type:recorder.mimeType||type});
        if(!result.size){reject(new Error('لم ينتج المتصفح ملف فيديو صالحًا.'));return;}
        resolve(result);
      };
      const origin=audio.currentTime+.08;
      function frame(){const time=Math.max(0,Math.min(plan.duration,audio.currentTime-origin));paintContent(canvas,plan,images,time);onProgress(time/plan.duration);raf=requestAnimationFrame(frame);}
      source.onended=()=>{finishTimer=setTimeout(()=>{if(recorder.state!=='inactive')recorder.stop();},150);};
      recorder.start(500);source.start(origin);frame();
    });
    onProgress(1);return {blob,extension:blob.type.includes('mp4')?'mp4':'webm'};
  }finally{
    cancelAnimationFrame(raf);clearTimeout(finishTimer);document.removeEventListener('visibilitychange',visibility);
    try{source.stop();}catch{}if(recorder&&recorder.state!=='inactive')recorder.stop();
    stream?.getTracks().forEach(track=>track.stop());source.disconnect();await audio.close().catch(()=>{});
  }
}
