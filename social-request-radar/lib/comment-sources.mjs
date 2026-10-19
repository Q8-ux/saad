const hosts={instagram:['instagram.com'],x:['x.com','twitter.com'],youtube:['youtube.com','youtu.be'],tiktok:['tiktok.com'],reddit:['reddit.com','redd.it'],facebook:['facebook.com','fb.watch']};
export function validatePlatformSourceUrl(value,platform){
  try{const u=new URL(String(value));if(u.protocol!=='https:'||u.username||u.password||!hosts[platform]?.some(h=>u.hostname===h||u.hostname.endsWith('.'+h)))throw Error();u.hash='';return u.href;}catch{throw Error('رابط مصدر غير صالح للمنصة المحددة.');}
}
const first=values=>values.find(v=>v!==undefined&&v!==null&&v!=='');
// Never turn an imprecisely parsed JSON number or a synthetic ID into a permalink.
const exactId=value=>typeof value==='number'&&!Number.isSafeInteger(value)?'':typeof value==='string'||typeof value==='number'?String(value):'';
export function nativeCommentId(raw,platform){
  const canonical=typeof raw.id==='string'&&raw.id.startsWith(platform+':');
  return exactId(first([raw.nativeId,raw.commentId,raw.comment_id,canonical?(raw.id.startsWith(platform+':derived:')?'':raw.id.slice(platform.length+1)):raw.id,raw.pk,raw.cid,raw.rest_id]));
}
export function sourcePlatform(raw={}){
  if(Object.hasOwn(hosts,raw.platform))return raw.platform;
  const prefix=String(raw.id||'').split(':')[0];if(Object.hasOwn(hosts,prefix))return prefix;
  try{const hostname=new URL(raw.sourceUrl||raw.commentUrl||raw.postUrl).hostname;return Object.keys(hosts).find(p=>hosts[p].some(h=>hostname===h||hostname.endsWith('.'+h)))||'';}catch{return '';}
}
function numeric(value,min=5){const id=exactId(value);return new RegExp('^\\d{'+min+',30}$').test(id)?id:'';}
function facebookId(value){
  let id=exactId(value);if(!/^\d+(?:_\d+)?$/.test(id))try{const decoded=atob(id);id=/^comment:(\d+_\d+)$/.exec(decoded)?.[1]||'';}catch{return '';}
  return numeric(id.split('_').at(-1));
}
function targetId(u,p){
  if(p!=='x'&&!postFrom(u.href,p))return '';
  if(p==='instagram')return /\/(?:p|reel|reels|tv)\/[^/]+\/c\/(\d+)(?:\/r\/(\d+))?\/?$/.exec(u.pathname)?.slice(1).filter(Boolean).at(-1)||'';
  if(p==='youtube')return u.searchParams.get('lc')||'';
  if(p==='tiktok')return u.searchParams.get('share_comment_id')||u.searchParams.get('comment_id')||'';
  if(p==='facebook')return u.searchParams.get('reply_comment_id')||u.searchParams.get('comment_id')||'';
  if(p==='reddit')return /\/comments\/[a-z0-9]+\/[^/]+\/([a-z0-9]+)\/?$/i.exec(u.pathname)?.[1]||'';
  if(p==='x')return /\/(?:[^/]+\/)?status\/(\d+)\/?$/.exec(u.pathname)?.[1]||'';
  return '';
}
function postFrom(value,p){
  const u=new URL(value);
  if(p==='instagram'){const m=/^\/(?:p|reel|reels|tv)\/([^/]+)/.exec(u.pathname);if(!m)return '';u.pathname=u.pathname.slice(0,m[0].length)+'/';u.search='';}
  if(p==='youtube'){if(u.hostname==='youtu.be'){u.searchParams.delete('lc');}else if(!u.searchParams.get('v')&&!/^\/(shorts|live)\/[^/]+/.test(u.pathname))return '';else u.searchParams.delete('lc');}
  if(p==='tiktok'){if(!/\/(?:video\/\d+|v\/\d+\.html)/.test(u.pathname))return '';for(const key of [...u.searchParams.keys()])if(key!=='lang')u.searchParams.delete(key);}
  if(p==='reddit'){const m=/^(.*\/comments\/[a-z0-9]+\/[^/]+)(?:\/[a-z0-9]+)?\/?$/i.exec(u.pathname);if(!m)return '';u.pathname=m[1]+'/';u.search='';}
  if(p==='facebook'){if(!/\/(?:.*\/)?(?:posts|videos|reel|permalink|story|watch|photo)(?:[/.]|$)/.test(u.pathname)&&!u.searchParams.has('story_fbid')&&u.hostname!=='fb.watch')return '';u.searchParams.delete('comment_id');u.searchParams.delete('reply_comment_id');}
  if(p==='x'&&!targetId(u,p))return '';
  return u.href;
}
/** Resolve a destination without claiming that a constructed link was visited. */
export function commentSource(raw={},options={}){
  const platform=options.platform||sourcePlatform(raw),kind=options.kind||raw.kind||'comment';
  const relative=v=>platform==='reddit'&&typeof v==='string'&&v.startsWith('/r/')?'https://www.reddit.com'+v:v;
  const primary=first([raw.sourceUrl,raw.postUrl,raw.post_url,raw.url,raw.permalink,raw.commentUrl,raw.comment_url,raw.share_info?.url,options.postUrl]);
  const source=validatePlatformSourceUrl(relative(primary),platform);
  const candidates=[raw.commentUrl,raw.comment_url,raw.permalink,raw.share_info?.url,raw.sourceUrl,raw.url].filter(v=>v!==undefined&&v!==null&&v!=='').map(v=>validatePlatformSourceUrl(relative(v),platform));
  // Validate additional URL fields as strictly as sourceUrl (also on transfer imports).
  const postCandidates=[raw.postUrl,raw.post_url,options.postUrl,source].filter(Boolean).map(v=>validatePlatformSourceUrl(relative(v),platform));
  let postUrl=postCandidates.map(v=>postFrom(v,platform)).find(Boolean)||source;
  const id=nativeCommentId(raw,platform),own=platform==='facebook'?facebookId(id):platform==='reddit'?id.replace(/^t1_/,''):id;
  const parent=exactId(first([raw.parentId,raw.parent_id,raw.parent_comment_id,raw.replied_to_comment_id,raw.reply_id,options.parentId]));
  if(kind==='post')return {sourceUrl:source,commentUrl:'',postUrl:source,sourceKind:'post',sourceStatus:'provided'};
  const provided=candidates.find(value=>{const target=targetId(new URL(value),platform);return target&&(!id||target===own)&&!id.startsWith(platform+':derived:');});
  if(provided)return {sourceUrl:provided,commentUrl:provided,postUrl,sourceKind:'comment',sourceStatus:raw.sourceStatus==='constructed'?'constructed':'provided'};
  let direct='';const u=new URL(postUrl);
  if(platform==='instagram'&&numeric(id,10)){
    const shortcode=/^\/(?:p|reel|reels|tv)\/([^/]+)/.exec(u.pathname)?.[1];
    if(shortcode){const root=numeric(parent.replace(/^instagram:/,''),10);if(kind!=='reply'||root)direct='https://www.instagram.com/p/'+shortcode+'/c/'+(root?root+'/r/':'')+id+'/';}
  }
  if(platform==='youtube'&&/^[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]+)*$/.test(id)){
    const video=u.searchParams.get('v')||(u.hostname==='youtu.be'?u.pathname.slice(1):/^\/(?:shorts|live)\/([^/]+)/.exec(u.pathname)?.[1]);
    if(video&&/^[A-Za-z0-9_-]+$/.test(video))direct='https://www.youtube.com/watch?v='+encodeURIComponent(video)+'&lc='+encodeURIComponent(id);
  }
  if(platform==='tiktok'&&numeric(id,10)){
    const video=/\/(?:video\/|v\/)(\d{10,30})/.exec(u.pathname)?.[1]||numeric(first([raw.videoId,raw.video_id,raw.aweme_id]),10);
    if(video)direct='https://m.tiktok.com/v/'+video+'.html'+'?share_item_id='+video+'&share_comment_id='+id;
  }
  if(platform==='facebook'&&own&&postFrom(postUrl,platform)){
    const root=facebookId(parent.replace(/^facebook:/,''));
    if(kind!=='reply'||root){u.searchParams.set('comment_id',root||own);if(root&&root!==own)u.searchParams.set('reply_comment_id',own);direct=u.href;}
  }
  if(platform==='reddit'&&/^[a-z0-9]+$/i.test(own)&&!id.startsWith('t3_')&&postFrom(postUrl,platform))direct=postUrl.replace(/\/$/,'')+'/'+own+'/';
  if(platform==='x'&&numeric(id))direct='https://x.com/i/status/'+id;
  return {sourceUrl:direct||postUrl,commentUrl:direct,postUrl,sourceKind:direct?'comment':'post',sourceStatus:direct?'constructed':'post_only'};
}
export function withCommentSource(raw){return {...raw,...commentSource(raw)};}
export function sourceSnapshot(raw){const platform=sourcePlatform(raw);return {id:raw.id,text:raw.text,platform,kind:raw.kind||'comment',nativeId:nativeCommentId(raw,platform),parentId:raw.parentId||null,...commentSource(raw,{platform})};}
