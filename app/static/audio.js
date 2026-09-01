(()=>{
let ctx=null,muted=localStorage.getItem('chess_muted')==='1',unlocked=false;
const button=()=>document.getElementById('soundToggle');
function update(){const b=button();if(!b)return;b.textContent=muted?'🔇':'🔊';b.classList.toggle('muted',muted);b.setAttribute('aria-label',t(muted?'soundOn':'soundOff'));b.title=t(muted?'soundOn':'soundOff')}
function ensure(){if(!ctx)ctx=new(window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();unlocked=true;return ctx}
function tone(freq,duration=.1,type='sine',gain=.07,delay=0){if(muted||!unlocked)return;const c=ensure(),o=c.createOscillator(),g=c.createGain(),now=c.currentTime+delay;o.type=type;o.frequency.setValueAtTime(freq,now);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(gain,now+.012);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g).connect(c.destination);o.start(now);o.stop(now+duration+.02)}
function noise(duration=.35,gain=.035,delay=0){if(muted||!unlocked)return;const c=ensure(),len=Math.floor(c.sampleRate*duration),buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);const src=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain(),now=c.currentTime+delay;src.buffer=buf;filter.type='bandpass';filter.frequency.value=900;filter.Q.value=.55;g.gain.setValueAtTime(gain,now);g.gain.exponentialRampToValueAtTime(.0001,now+duration);src.connect(filter).connect(g).connect(c.destination);src.start(now)}
const sound={
 move(){tone(260,.055,'triangle',.045);tone(190,.07,'sine',.035,.045)},
 capture(){tone(150,.09,'square',.045);noise(.12,.025)},
 check(){tone(520,.09,'triangle',.055);tone(760,.14,'triangle',.05,.09)},
 challenge(){[294,370,440,587].forEach((f,i)=>tone(f,.16,'triangle',.05,i*.09));noise(.45,.018,.12)},
 crowd(){noise(.7,.045);[440,554,659].forEach((f,i)=>tone(f,.28,'sine',.018,.1+i*.06))},
 win(){[392,494,587,784].forEach((f,i)=>tone(f,.3,'triangle',.07,i*.14));setTimeout(()=>sound.crowd(),220)},
 loss(){[330,277,220,165].forEach((f,i)=>tone(f,.3,'sawtooth',.035,i*.16))},
 draw(){tone(330,.18,'sine',.045);tone(330,.18,'sine',.035,.22)},
 transition(){tone(420,.045,'sine',.025);tone(620,.06,'sine',.02,.04)}
};
window.chessSound={play:name=>{if(sound[name])sound[name]()},isMuted:()=>muted};
function unlock(){ensure();document.removeEventListener('pointerdown',unlock)}
document.addEventListener('pointerdown',unlock,{passive:true});
document.addEventListener('DOMContentLoaded',()=>{update();button()?.addEventListener('click',()=>{ensure();muted=!muted;localStorage.setItem('chess_muted',muted?'1':'0');update();if(!muted)sound.transition()})});
window.addEventListener('languagechange',update);
})();