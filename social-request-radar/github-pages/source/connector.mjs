export function createConnector(endpoint,fetcher=fetch,initialBlocker=''){
  if(!endpoint)return null;
  const base=new URL(endpoint.endsWith('/')?endpoint:endpoint+'/');if(base.protocol!=='https:'||base.username||base.password)throw Error('عنوان خادم البحث غير صالح.');
  async function request(path,body){
    let response;try{response=await fetcher(new URL(path.replace(/^\/+/,''),base),{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(path==='/api/search'?140000:30000),credentials:'omit'});}catch{throw Error('تعذر الاتصال بخادم البحث. أعد فحص حالة الربط من «مصادر البيانات».');}
    let data;try{data=await response.json();}catch{throw Error('خادم البحث أعاد استجابة غير قابلة للقراءة.');}
    if(!response.ok)throw Error(data.error||'تعذر إتمام الاتصال بخادم البحث.');return data;
  }
  return {endpoint:base.href.replace(/\/$/,''),initialBlocker,status:credential=>request('/api/status',credential?{credential}:undefined),configure:apiKey=>request('/api/configure',{apiKey}),search:(body,credential)=>request('/api/search',{...body,credential})};
}
