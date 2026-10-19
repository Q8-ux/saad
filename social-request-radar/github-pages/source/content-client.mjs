export const contentEndpoint='https://wvzkpazvtnclcghjrjvv.supabase.co/functions/v1/radar-content';
export async function contentRequest(operation,body){
  const response=await fetch(contentEndpoint+'/'+operation,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,credentials:'omit',signal:AbortSignal.timeout(operation==='generate'?70000:30000)});
  if(operation==='artifact'&&response.ok)return response.blob();
  let result;try{result=await response.json();}catch{throw Error('تعذر قراءة استجابة خدمة المحتوى.');}
  if(!response.ok)throw Error(result.error||'تعذر إتمام مهمة المحتوى.');return result;
}
