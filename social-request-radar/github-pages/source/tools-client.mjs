export const toolsEndpoint='https://wvzkpazvtnclcghjrjvv.supabase.co/functions/v1/radar-tools';
export const workerWorkflow='https://github.com/Q8-ux/saad/actions/workflows/radar-tools-worker.yml';
export async function toolRequest(operation,body){
  const response=await fetch(toolsEndpoint+'/'+operation,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,credentials:'omit',signal:AbortSignal.timeout(25000)});
  const data=await response.json();if(!response.ok)throw Error(data.error||'تعذر تشغيل الأدوات.');return data;
}
export function jobTicket(){return {id:crypto.randomUUID(),token:btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(48)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')};}
