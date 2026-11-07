export const REPO='Q8-ux/sabeq-admin-console';
export const WORKFLOW='sabeq-sync-monitor.yml';
export function operationState(r){if(r?.status==='failed')return 'failed';return r?.success===true&&r.status==='verified'&&Array.isArray(r.receipts)&&r.receipts.length>0&&r.receipts.every(x=>x.source_id&&x.source_id===x.target_id&&x.read_back===true)?'verified':'pending'}
export function csvCell(v){let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}
export function safeMemos(data){if(!Array.isArray(data)||data.length>1000)throw Error('المطلوب قائمة لا تتجاوز ١٠٠٠ مذكرة.');return data.map(m=>{if(!m||typeof m.id!=='string'||m.id.length>120)throw Error('معرّف مذكرة غير صالح.');return {id:m.id,title:typeof m.title==='string'?m.title.slice(0,150):'مذكرة مولّدة',created_at:m.created_at||null,last_send_at:m.last_send_at||null,error:typeof m.error==='string'?m.error.slice(0,300):null,sync:'pending',source:'import'}})}
