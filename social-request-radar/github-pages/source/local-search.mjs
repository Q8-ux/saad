import MiniSearch from 'minisearch';
import {norm} from '../../lib/radar-core.mjs';
const prefixes=['بال','وال','كال','لل','ال','و','ف','ب','ل','ك'];
function tokens(text){const original=norm(text).match(/[\p{L}\p{N}]+/gu)||[];return original.flatMap(token=>[token,...prefixes.filter(prefix=>token.startsWith(prefix)&&token.length-prefix.length>=3).map(prefix=>token.slice(prefix.length))]);}
export function resultIndex(rows){
  const index=new MiniSearch({fields:['text','author'],storeFields:['id'],tokenize:tokens,processTerm:term=>norm(term),searchOptions:{combineWith:'AND'}});
  index.addAll(rows.map(row=>({id:row.id,text:row.text,author:row.author||''})));
  return {size:rows.length,search:(query,{fuzzy=false}={})=>query.trim()?index.search(query,{prefix:true,fuzzy:fuzzy?0.15:false}).map(hit=>hit.id):rows.map(row=>row.id)};
}
