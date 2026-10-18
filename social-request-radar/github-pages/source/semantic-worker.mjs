import model from '../../worker/model.json';
const runtime='https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/dist/transformers.web.min.js';
let extractor,meanPooling;
self.onmessage=async({data})=>{
  try{
    if(data.operation!=='analyze'||!Array.isArray(data.records)||data.records.length<2||data.records.length>80)throw Error('اختر بين نصّين و٨٠ نصًا.');
    if(!extractor){
      const library=await import(/* @vite-ignore */ runtime);library.env.backends.onnx.wasm.numThreads=1;meanPooling=library.mean_pooling;
      extractor=await library.pipeline('feature-extraction',model.id,{revision:model.revision,model_file_name:model.onnxFile,dtype:'fp32',device:'wasm',progress_callback:progress=>self.postMessage({kind:'progress',stage:progress.status,progress:progress.progress})});
    }
    const vectors=[];
    for(let start=0;start<data.records.length;start+=8){
      const batch=data.records.slice(start,start+8);
      const inputs=extractor.tokenizer(batch.map(row=>row.text.slice(0,1000)),{padding:true,truncation:true,max_length:model.maxTokens});
      const output=await extractor.model(inputs);vectors.push(...meanPooling(output.last_hidden_state,inputs.attention_mask).normalize(2,-1).tolist());
      self.postMessage({kind:'progress',stage:'analysis',progress:Math.min(100,(start+batch.length)/data.records.length*100)});
    }
    const pairs=[];for(let i=0;i<vectors.length;i++)for(let j=i+1;j<vectors.length;j++)pairs.push({left:data.records[i].id,right:data.records[j].id,cosine:vectors[i].reduce((sum,v,k)=>sum+v*vectors[j][k],0)});
    pairs.sort((a,b)=>b.cosine-a.cosine);self.postMessage({kind:'complete',result:{model,count:vectors.length,dimensions:vectors[0].length,pairs:pairs.slice(0,12),engine:'Transformers.js · WASM'}});
  }catch(error){self.postMessage({kind:'error',message:'تعذر تحميل النموذج أو تشغيله: '+error.message});}
};
