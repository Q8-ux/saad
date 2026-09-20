import {parseTime,formatTime} from './core.mjs';
export function parseSubtitles(text){
  const clean=String(text).replace(/^\uFEFF/,'').replace(/\r/g,'').replace(/^WEBVTT[^\n]*\n/,'').trim();
  const rows=[];
  for(const block of clean.split(/\n\s*\n/)){
    const lines=block.split('\n');const idx=lines.findIndex(l=>l.includes('-->'));if(idx<0)continue;
    const parts=lines[idx].split('-->').map(x=>x.trim().split(/\s/)[0].replace(',','.'));
    const start=parseTime(parts[0]),end=parseTime(parts[1]);const body=lines.slice(idx+1).join('\n').replace(/<[^>]*>/g,'').trim();
    if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||!body||body.length>1000)throw new Error('invalidSubtitles');
    rows.push({start,end,text:body});
  }
  if(!rows.length||rows.length>15000)throw new Error('invalidSubtitles');
  return rows.sort((a,b)=>a.start-b.start);
}
function srtTime(n){const ms=Math.round(n*1000);const h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;}
export function clipSubtitles(cues,start,end){return cues.filter(c=>c.end>start&&c.start<end).map(c=>({text:c.text,start:Math.max(0,c.start-start),end:Math.min(end-start,c.end-start)}));}
export function toSrt(cues){return cues.map((c,i)=>`${i+1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}`).join('\n\n')+'\n';}
export function reviewClips(clips,duration){
  const issues=[];const seen=new Set();for(const [i,c] of clips.entries()){if(c.remote)continue;if(!c.title?.trim())issues.push({index:i,key:'reviewTitle'});if(!Number.isFinite(c.start)||!Number.isFinite(c.end)||c.start<0||c.end>duration+.01||c.end<=c.start)issues.push({index:i,key:'reviewTime'});if(c.end-c.start>180)issues.push({index:i,key:'reviewLength'});const key=`${c.start.toFixed(2)}:${c.end.toFixed(2)}:${c.ratio}`;if(seen.has(key))issues.push({index:i,key:'reviewDuplicate'});seen.add(key);}return {clips:clips.length,issues,passed:clips.length>0&&issues.length===0};
}
export function drawCaptions(ctx,canvas,time,cues){
  const cue=cues.find(c=>time>=c.start&&time<c.end);if(!cue)return;
  const size=Math.max(18,Math.round(canvas.width*.045));ctx.save();ctx.font=`600 ${size}px "IBM Plex Sans Arabic", "Inter", Arial, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.direction=/[\u0600-\u06FF]/.test(cue.text)?'rtl':'ltr';
  const words=cue.text.split(/\s+/),lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>canvas.width*.82&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);const shown=lines.slice(0,4),height=shown.length*size*1.5+size;const top=canvas.height-Math.max(canvas.height*.09,25)-height;
  ctx.fillStyle='rgba(6,12,8,.8)';ctx.fillRect(canvas.width*.06,top,canvas.width*.88,height);ctx.fillStyle='#fff';shown.forEach((l,i)=>ctx.fillText(l,canvas.width/2,top+size+(i*size*1.5),canvas.width*.82));ctx.restore();
}
