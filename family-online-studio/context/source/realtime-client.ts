import {acquireStudioMicrophone,microphoneFailureMessage} from "./studio-mic-support.mjs";
export type LiveState="idle"|"permission"|"connecting"|"reconnecting"|"listening"|"thinking"|"speaking";
type Options={
 history?:Array<{role:"user"|"assistant";content:string}>;
 attachments?:string[];
 session:(sdp:string,signal:AbortSignal)=>Promise<{sdp:string;maxDurationSeconds:number}>;
 lookup:(query:string,workId:string,signal:AbortSignal)=>Promise<unknown>;
 onState:(state:LiveState)=>void;onError:(message:string)=>void;
 onTranscript:(id:string,role:"user"|"assistant",text:string,delta:boolean)=>void;
 onPlaybackBlocked:(blocked:boolean)=>void;onSources:(result:unknown)=>void;
 onEnded:()=>void;
};
// Own the entire media lifecycle, including a permission prompt that resolves after Stop.
export class RealtimeConversation{
 private run=0;private pc:RTCPeerConnection|null=null;private channel:RTCDataChannel|null=null;
 private stream:MediaStream|null=null;private audio:HTMLAudioElement|null=null;private abort:AbortController|null=null;
 private timer:ReturnType<typeof setTimeout>|null=null;private connectTimer:ReturnType<typeof setTimeout>|null=null;
 private disconnectTimer:ReturnType<typeof setTimeout>|null=null;private muted=false;private attachments:string[];
 private seen=new Set<string>();private responding=false;private pendingTools=0;private toolOutput=false;
 constructor(private options:Options){this.attachments=[...(options.attachments||[])];}
 private alive(id:number){return id===this.run&&!this.abort?.signal.aborted;}
 private send(value:unknown){if(this.channel?.readyState==="open")this.channel.send(JSON.stringify(value));}
 attachContext(text:string){if(!text)return;this.attachments.push(text);this.send({type:"conversation.item.create",item:{type:"message",role:"user",content:[{type:"input_text",text}]}});}
 stop(){
  this.run++;this.abort?.abort();this.abort=null;
  if(this.timer)clearTimeout(this.timer);if(this.connectTimer)clearTimeout(this.connectTimer);if(this.disconnectTimer)clearTimeout(this.disconnectTimer);this.timer=null;this.connectTimer=null;this.disconnectTimer=null;
  const pc=this.pc,channel=this.channel;this.pc=null;this.channel=null;
  if(channel){channel.onmessage=null;channel.onopen=null;channel.onclose=null;channel.onerror=null;channel.close();}
  if(pc){pc.ontrack=null;pc.onconnectionstatechange=null;pc.close();}
  this.stream?.getTracks().forEach(t=>{t.onended=null;t.stop();});this.stream=null;
  if(this.audio){this.audio.pause();this.audio.srcObject=null;this.audio.remove();this.audio=null;}
  this.seen.clear();this.responding=false;this.pendingTools=0;this.toolOutput=false;this.options.onPlaybackBlocked(false);this.options.onState("idle");
 }
 setMuted(muted:boolean){this.muted=muted;this.stream?.getAudioTracks().forEach(t=>{t.enabled=!muted;});}
 async resumeAudio(){if(!this.audio?.srcObject)return;try{await this.audio.play();this.options.onPlaybackBlocked(false);}catch{this.options.onPlaybackBlocked(true);}}
 private fail(message:string){this.stop();this.options.onError(message);this.options.onEnded();}
 async start(){
  this.stop();const id=++this.run,ctrl=new AbortController();this.abort=ctrl;this.muted=false;
  if(globalThis.isSecureContext===false||!navigator.mediaDevices?.getUserMedia||typeof RTCPeerConnection==="undefined"){this.fail("افتح الاستيديو في Chrome عبر رابط HTTPS للسماح بالميكروفون والتحدث المباشر.");return;}
  this.options.onState("permission");let phase:"microphone"|"connection"="microphone";
  this.connectTimer=setTimeout(()=>{if(this.alive(id))this.fail(phase==="microphone"?"لم يصل إذن الميكروفون. اسمح به من أذونات الموقع ثم اضغط بدء الحديث.":"انتهت مهلة الاتصال الصوتي. تحقق من الشبكة ثم أعد المحاولة.");},45000);
  try{
   const stream:MediaStream=await acquireStudioMicrophone(navigator.mediaDevices);
   if(!this.alive(id)){stream.getTracks().forEach(t=>t.stop());return;}
   this.stream=stream;phase="connection";this.options.onState("connecting");const pc=new RTCPeerConnection();this.pc=pc;
   const audio=document.createElement("audio");audio.autoplay=true;audio.muted=false;audio.volume=1;audio.setAttribute("playsinline","");this.audio=audio;
   for(const track of stream.getAudioTracks()){track.enabled=!this.muted;pc.addTrack(track,stream);track.onended=()=>{if(this.alive(id))this.fail("توقف الميكروفون. ابدأ المحادثة مجددًا عند الاستعداد.");};}
   pc.ontrack=event=>{if(!this.alive(id))return;audio.srcObject=event.streams[0]||new MediaStream([event.track]);void this.resumeAudio();};
   pc.onconnectionstatechange=()=>{if(!this.alive(id))return;
    if(pc.connectionState==="connected"){if(this.disconnectTimer)clearTimeout(this.disconnectTimer);this.disconnectTimer=null;this.options.onState("listening");}
    else if(pc.connectionState==="disconnected"){this.options.onState("reconnecting");if(!this.disconnectTimer)this.disconnectTimer=setTimeout(()=>{if(this.alive(id)&&pc.connectionState==="disconnected")this.fail("انقطع الاتصال الصوتي. تحقق من الشبكة ثم ابدأ الحديث مجددًا.");},10000);}
    else if(["failed","closed"].includes(pc.connectionState))this.fail("انقطع الاتصال الصوتي. يمكنك بدء محادثة جديدة.");
   };
   const channel=pc.createDataChannel("oai-events");this.channel=channel;
   channel.onmessage=event=>{if(!this.alive(id))return;try{void this.event(JSON.parse(event.data),id).catch(()=>{if(this.alive(id))this.fail("تعذر إكمال الرد الصوتي؛ ابدأ الحديث مجددًا.");});}catch{/* Ignore malformed wire events. */}};
   channel.onclose=()=>{if(this.alive(id))this.fail("انتهى الاتصال الصوتي.");};
   channel.onerror=()=>{if(this.alive(id))this.fail("تعذر استمرار الاتصال الصوتي.");};
   channel.onopen=()=>{
    if(!this.alive(id))return;if(this.connectTimer)clearTimeout(this.connectTimer);this.connectTimer=null;
    for(const turn of this.options.history||[])this.send({type:"conversation.item.create",item:{type:"message",role:turn.role,content:[{type:turn.role==="user"?"input_text":"output_text",text:turn.content.slice(0,6000)}]}});
    for(const text of this.attachments)this.send({type:"conversation.item.create",item:{type:"message",role:"user",content:[{type:"input_text",text}]}});
    this.options.onState("listening");
   };
   const offer=await pc.createOffer();if(!this.alive(id))return;await pc.setLocalDescription(offer);
   const response=await this.options.session(offer.sdp||"",ctrl.signal);if(!this.alive(id))return;
   await pc.setRemoteDescription({type:"answer",sdp:response.sdp});if(!this.alive(id))return;
   this.timer=setTimeout(()=>{if(this.alive(id)){this.stop();this.options.onEnded();}},Math.min(response.maxDurationSeconds||600,600)*1000);
  }catch(error){if(!this.alive(id))return;this.fail(phase==="microphone"?microphoneFailureMessage(error):error instanceof Error?error.message:"تعذر بدء المحادثة المباشرة.");}
 }
 private continueResponse(){if(this.toolOutput&&!this.responding&&this.pendingTools===0){this.toolOutput=false;this.responding=true;this.send({type:"response.create"});}}
 private async tool(item:Record<string,unknown>,id:number){
  if(item.type!=="function_call"||typeof item.call_id!=="string"||this.seen.has(item.call_id))return;
  this.seen.add(item.call_id);this.pendingTools++;this.options.onState("thinking");
  let output:unknown;
  try{
   if(item.name!=="search_my_works")throw Error("الأداة غير متاحة.");
   const args=JSON.parse(String(item.arguments||"{}"));
   if(typeof args.query!=="string"||!args.query.trim()||args.query.length>6000)throw Error("حدد العمل والسؤال لإعادة البحث.");
   output=await this.options.lookup(args.query,typeof args.workId==="string"?args.workId:"auto",this.abort!.signal);
   if(!this.alive(id))return;this.options.onSources(output);
  }catch(error){if(!this.alive(id))return;output={error:error instanceof Error?error.message:"تعذر البحث في العمل. لا تجب عن محتواه دون مصدر."};}
  if(!this.alive(id))return;
  this.send({type:"conversation.item.create",item:{type:"function_call_output",call_id:item.call_id,output:JSON.stringify(output)}});
  this.pendingTools--;this.toolOutput=true;this.continueResponse();
 }
 private async event(event:Record<string,unknown>,id:number){
  switch(event.type){
   case "input_audio_buffer.speech_started":this.options.onState("listening");break;
   case "input_audio_buffer.speech_stopped":this.options.onState("thinking");break;
   case "response.created":this.responding=true;this.options.onState("thinking");break;
   case "output_audio_buffer.started":this.options.onState("speaking");break;
   case "output_audio_buffer.stopped":case "output_audio_buffer.cleared":this.options.onState("listening");break;
   case "conversation.item.input_audio_transcription.completed":if(typeof event.transcript==="string")this.options.onTranscript(String(event.item_id),"user",event.transcript,false);break;
   case "response.output_audio_transcript.delta":case "response.audio_transcript.delta":if(typeof event.delta==="string")this.options.onTranscript(String(event.item_id||event.response_id),"assistant",event.delta,true);break;
   case "response.output_item.done":if(event.item&&typeof event.item==="object")await this.tool(event.item as Record<string,unknown>,id);break;
   case "response.done":{
    this.responding=false;const response=event.response as {status?:string;output?:Record<string,unknown>[]}|undefined;
    if(response?.status==="failed"){this.fail("لم يكتمل الرد الصوتي. أعد بدء المحادثة أو استخدم الكتابة.");return;}
    for(const item of response?.output||[])await this.tool(item,id);
    this.continueResponse();
    break;
   }
   case "error":this.fail("حدث خطأ في المحادثة الصوتية. أعد البدء أو استخدم الكتابة.");break;
  }
 }
}
