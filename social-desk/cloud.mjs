export const API_BASE='https://br-small-firefly-bg6hh3qv-socialdesk.compute.c-9.eu-central-1.aws.neon.tech/';
let token='';try{token=sessionStorage.getItem('social-desk.cloud-session')||'';}catch{}
export const signedIn=()=>!!token;
export function signOut(){token='';try{sessionStorage.removeItem('social-desk.cloud-session');}catch{}}
export async function api(path,{method='GET',body}={}){
  const response=await fetch(API_BASE.replace(/\/$/,'')+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,credentials:'omit',signal:AbortSignal.timeout(115000)});
  let data;try{data=await response.json();}catch{throw new Error('الخادم لم يرجع استجابة صالحة.');}
  if(!response.ok||data.error){const e=new Error(data.error?.message||'تعذر إتمام الطلب.');e.code=data.error?.code;e.status=response.status;if(response.status===401){signOut();window.dispatchEvent(new Event('cloud-auth-required'));}throw e;}
  return data;
}
export async function signIn(username,password){const r=await api('/session',{method:'POST',body:{username,password}});token=r.token;try{sessionStorage.setItem('social-desk.cloud-session',token);}catch{}return r;}
