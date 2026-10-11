const API='https://generativelanguage.googleapis.com/v1beta';
export function makeGemini({fetchImpl=globalThis.fetch}={}) {
  let key=''; let model=''; let outputLimit=12000; let usage={requests:0,promptTokens:0,outputTokens:0};
  const timeoutSignal=(signal,ms)=>{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(new Error('انتهت مهلة الاتصال.')),ms);
    const abort=()=>controller.abort(signal.reason);if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
    return {signal:controller.signal,clear(){clearTimeout(timer);signal?.removeEventListener('abort',abort);}};
  };
  const request=async(path,options={},signal)=>{
    const timed=timeoutSignal(signal,90000);
    try {
      const r=await fetchImpl(`${API}/${path}`,{...options,headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:timed.signal});
      let data;try{data=await r.json();}catch{throw new Error('رد غير مفهوم من مزوّد الذكاء الاصطناعي.');}
      if(!r.ok){const errors={400:'تعذّر تنفيذ الطلب. تحقق من صلاحية المفتاح والنموذج.',401:'مفتاح API غير صالح.',403:'المفتاح لا يملك صلاحية أو الخدمة غير متاحة لهذا الحساب.',404:'النموذج المختار لم يعد متاحاً. أعد الاتصال واختر نموذجاً آخر.',429:'تم بلوغ حد الاستخدام. انتظر قليلاً أو راجع رصيد حسابك.',500:'مزوّد الخدمة يواجه خطأ مؤقتاً.',503:'النموذج مشغول حالياً. حاول لاحقاً.'};throw new Error(errors[r.status]||`تعذّر الاتصال بالمزوّد (${r.status}).`);}
      return data;
    }catch(e){if(signal?.aborted)throw new Error('تم إيقاف الكتابة. المشاهد المكتملة محفوظة.');if(timed.signal.aborted)throw new Error('انتهت مهلة الاتصال بعد ٩٠ ثانية. المحرر ما زال يعمل ويمكنك المحاولة مجدداً.');if(e instanceof TypeError)throw new Error('تعذّر الوصول إلى Google. تحقق من الإنترنت وقيود المفتاح.');throw e;}
    finally{timed.clear();}
  };
  return {
    get connected(){return !!key&&!!model;},get model(){return model;},get usage(){return {...usage};},
    disconnect(){key='';model='';usage={requests:0,promptTokens:0,outputTokens:0};},
    async connect(value,signal){
      if(typeof value!=='string'||value.trim().length<15)throw new Error('أدخل مفتاح Gemini API صالحاً.');
      key=value.trim();model='';let models=[];let token='';
      try {
        for(let i=0;i<6;i++){
          const data=await request(`models?pageSize=100${token?`&pageToken=${encodeURIComponent(token)}`:''}`,{},signal);
          models.push(...(data.models||[]));token=data.nextPageToken;if(!token)break;
        }
        models=models.filter(m=>/^models\/gemini-[a-zA-Z0-9._-]+$/.test(m.name)&&m.supportedGenerationMethods?.includes('generateContent')&&!/image|tts|audio|live|robotics|computer-use|embedding|vision-only/i.test(m.name));
        models.sort((a,b)=>(/flash/.test(b.name)?1:0)-(/flash/.test(a.name)?1:0)||b.name.localeCompare(a.name,undefined,{numeric:true}));
        if(!models.length)throw new Error('لا توجد نماذج كتابة متاحة لهذا المفتاح.');
        model=models[0].name;outputLimit=Math.min(models[0].outputTokenLimit||12000,12000);
        return models.map(m=>({name:m.name,label:m.displayName||m.name.replace('models/',''),limit:m.outputTokenLimit||12000}));
      }catch(e){key='';model='';throw e;}
    },
    select(value,limit){if(!/^models\/gemini-[a-zA-Z0-9._-]+$/.test(value))throw new Error('اسم النموذج غير صالح.');model=value;outputLimit=Math.min(limit||12000,12000);},
    async generate(prompt,signal){
      if(!key||!model)throw new Error('اربط مفتاح Gemini أولاً من إعدادات الكاتب.');
      const data=await request(`${model}:generateContent`,{method:'POST',body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',maxOutputTokens:outputLimit}})},signal);
      usage.requests++;
      usage.promptTokens+=data.usageMetadata?.promptTokenCount||0;
      usage.outputTokens+=data.usageMetadata?.candidatesTokenCount||0;
      const c=data.candidates?.[0];
      if(c?.finishReason&&c.finishReason!=='STOP')throw new Error(c.finishReason==='MAX_TOKENS'?'رد الكاتب انقطع عند حد الطول. اختر نموذجاً أوسع أو قلّل عدد المشاهد.':'لم يكمل المزوّد الرد؛ لم تُستبدل مسودتك.');
      const text=(c?.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join('').trim();
      if(!text)throw new Error('لم يُعد الكاتب نصاً. لم تُستبدل مسودتك.');
      try{return JSON.parse(text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}
      catch{throw new Error('رد الكاتب غير منظم بصيغة صالحة. مسودتك محفوظة؛ أعد المحاولة.');}
    }
  };
}
