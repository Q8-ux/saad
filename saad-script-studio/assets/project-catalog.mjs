export function projectKey(project){
  const title=String(project.title||'').trim();
  if(/^باركود(?:\s|[—–-]|$)/u.test(title)||/^BARCODE(?:\s|$)/i.test(title))return 'barcode';
  if(/^خارج الستوري(?:\s|[—–-]|$)/u.test(title))return 'outside-story';
  return null;
}
export function orderProjects(projects){
  const priority=p=>({'barcode':0,'outside-story':1}[projectKey(p)]??2);
  return [...projects].sort((a,b)=>priority(a)-priority(b));
}
export function mergeCatalog(projects,seeds,seen=[]){
  const result=[...projects],added=[],remembered=new Set(seen);
  for(const seed of seeds){
    const key=projectKey(seed);if(!key)continue;
    const exists=result.some(p=>p.id===seed.id||projectKey(p)===key);
    if(!exists&&!remembered.has(key)&&result.length<40){result.push(seed);added.push(seed.id);}
    if(exists||added.includes(seed.id))remembered.add(key);
  }
  return {projects:orderProjects(result),added,seen:[...remembered]};
}
