import React from 'react';
import {Composition, AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing} from 'remotion';

const toFrames = scenes => scenes.map(s => ({...s, frames: Math.max(1,Math.round(Number(s.duration)*30))}));
const fit = aspect => aspect==='16:9'?[1280,720]:aspect==='1:1'?[900,900]:[720,1280];

function Animation({scenes,title}) {
  const frame=useCurrentFrame(), {width,height}=useVideoConfig();
  let start=0, scene=scenes[0], local=0;
  for(const s of scenes){ if(frame < start+s.frames){scene=s;local=frame-start;break;} start+=s.frames;scene=s;local=s.frames-1;}
  const progress=local/Math.max(1,scene.frames-1);
  const drift=interpolate(progress,[0,1],[-width*.15,width*.15],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const scale=interpolate(progress,[0,1],[.86,1.08],{easing:Easing.inOut(Easing.ease)});
  const fade=Math.max(0,Math.min(1,local/8,(scene.frames-1-local)/8));
  return <AbsoluteFill style={{backgroundColor:scene.color||'#152758',fontFamily:'"Noto Sans Arabic", Tahoma, sans-serif',overflow:'hidden',color:'white'}}>
    <AbsoluteFill style={{background:'radial-gradient(ellipse at 40% 35%, #4b7dbd77, transparent 65%)'}}/>
    <AbsoluteFill style={{display:'flex',alignItems:'center',justifyContent:'center',transform:`translateX(${drift}px) scale(${scale})`}}>
      <svg width={width*.6} height={width*.6} viewBox="0 0 400 400">
        <defs><radialGradient id="g"><stop stopColor="#a5f3fc"/><stop offset="1" stopColor="#38bdf8"/></radialGradient></defs>
        <circle cx="200" cy="200" r="125" fill="url(#g)"/>
        <circle cx="156" cy="177" r="12" fill="#14223e"/>
        <circle cx="244" cy="177" r="12" fill="#14223e"/>
        <path d="M155 240 Q200 285 245 240" fill="none" stroke="#14223e" strokeWidth="12" strokeLinecap="round"/>
      </svg>
    </AbsoluteFill>
    <AbsoluteFill style={{display:'flex',flexDirection:'column',justifyContent:'flex-end',alignItems:'center',padding:`${Math.round(height*.09)}px ${Math.round(width*.07)}px`,textAlign:'center',direction:'rtl',opacity:fade,textShadow:'0 3px 15px #000'}}>
      <div style={{fontWeight:800,fontSize:Math.round(width*.062),lineHeight:1.5,marginBottom:18}}>{scene.title}</div>
      <div style={{fontSize:Math.round(width*.033),lineHeight:1.8,maxWidth:'100%',overflowWrap:'anywhere'}}>{String(scene.narration||scene.visual||'').slice(0,230)}</div>
    </AbsoluteFill>
  </AbsoluteFill>
}
export const Root=()=> <Composition id="Masar" component={Animation} durationInFrames={30} fps={30} width={720} height={1280}
  calculateMetadata={({props})=>{const [width,height]=fit(props.aspect);const scenes=toFrames(props.scenes);return {width,height,durationInFrames:scenes.reduce((n,s)=>n+s.frames,0),props:{...props,scenes}}}}
  defaultProps={{aspect:'9:16',title:'مسار الرسوم المتحركة',scenes:[{title:'مشهد',visual:'عرض متحرك',narration:'',duration:4,color:'#152758'}]}}/>;
