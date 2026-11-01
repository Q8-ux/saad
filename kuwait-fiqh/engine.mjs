export const MARKS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g;
export function normalize(text) {
  return String(text).normalize('NFKC').replace(MARKS, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي');
}
export function shard(term) {
  let h = 2166136261;
  for (const ch of term) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return h % 32;
}
const stop = new Set(['ما','حكم','ماهو','ماهي','هل','هو','هي','عن','في','من','علي','الي','مع','كيف','اريد','اعطني','ابحث','بين','الفرق','و','او','هذا','هذه','ذلك','التي','الذي']);
export function queryTokens(text) {
  const all = normalize(text).match(/[\u0621-\u064a]{2,}/g) || [];
  return [...new Set(all.filter(t => !stop.has(t)))].slice(0, 8);
}
export function variants(token) {
  const bare = token.replace(/^(?:وال|بال|فال|كال|لل|ال)/, '');
  return [...new Set([token, bare, 'ال'+bare, 'وال'+bare, 'بال'+bare, 'لل'+bare, 'فال'+bare])];
}
export function indexKey(term){
  if(term.length>5 && /^(وال|بال|فال|كال)/.test(term))return term.slice(3);
  if(term.length>4 && term.startsWith('لل'))return term.slice(2);
  if(term.length>4 && term.startsWith('ال'))return term.slice(2);
  return term;
}
export function intersect(lists) {
  if (!lists.length) return [];
  const ordered = [...lists].sort((a,b) => a.length-b.length);
  const sets = ordered.slice(1).map(x => new Set(x));
  return ordered[0].filter(id => sets.every(set => set.has(id)));
}
export function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function highlight(text, tokens) {
  if (!tokens.length) return escapeHTML(text);
  const norm = normalize(text), map = [];
  let position = 0;
  for (const ch of text) {
    for (const ignored of normalize(ch)) map.push(position);
    position += ch.length;
  }
  const ranges = [];
  for (const token of tokens) {
    let at = norm.indexOf(token);
    while (at !== -1 && ranges.length < 250) {
      ranges.push([map[at], (map[at+token.length-1] ?? text.length) + 1]);
      at = norm.indexOf(token, at + token.length);
    }
  }
  ranges.sort((a,b) => a[0]-b[0]);
  const merged=[];
  for(const r of ranges){const last=merged.at(-1); if(last && r[0]<=last[1])last[1]=Math.max(last[1],r[1]);else merged.push(r);}
  let out='', last=0;
  for(const [a,b] of merged){out+=escapeHTML(text.slice(last,a))+'<mark>'+escapeHTML(text.slice(a,b))+'</mark>';last=b;}
  return out+escapeHTML(text.slice(last));
}
export function excerpt(text, tokens, length=380) {
  const norm=normalize(text), at=Math.max(0, ...tokens.map(x=>norm.indexOf(x)).filter(x=>x>=0).slice(0,1));
  // Do not map normalized offsets into vocalized Arabic; locate the first match
  // using a per-character map so excerpts cannot cut away the actual query.
  const map=[];let pos=0;for(const c of text){for(const x of normalize(c))map.push(pos);pos+=c.length;}
  const originalAt=map[at] || 0;
  let begin=Math.max(0,originalAt-100);
  if(begin>0){const space=text.indexOf(' ',begin);if(space>=0)begin=space+1;}
  const end=Math.min(text.length,begin+length);
  return (begin?'… ':'')+text.slice(begin,end)+(end<text.length?' …':'');
}
export function validLocation(volume, location, catalog) {
  const v=catalog.volumes.find(x=>x.id===volume);
  return !!v && Number.isInteger(location) && location>=0 && location<v.paragraphs;
}
export function validateBackup(data,catalog){
  if(!data || data.format!=='kuwait-fiqh-notes' || data.version!==1 || !Array.isArray(data.items) || data.items.length>5000)throw new Error('صيغة النسخة الاحتياطية غير صحيحة.');
  const map=new Map();
  for(const x of data.items){
    if(!validLocation(x.volume,x.location,catalog)||typeof x.note!=='string'||x.note.length>15000||typeof x.saved!=='boolean')throw new Error('تحتوي النسخة على موضع أو ملاحظة غير صالحة.');
    const clean={volume:x.volume,location:x.location,note:x.note,saved:x.saved};
    if(clean.saved||clean.note)map.set(`${x.volume}:${x.location}`,clean);
  }
  return [...map.values()];
}
