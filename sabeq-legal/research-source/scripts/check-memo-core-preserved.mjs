import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const digest=value=>createHash('sha256').update(value).digest('hex');
export function instructionDigest(source){
  const ast=ts.createSourceFile('route.ts',source,ts.ScriptTarget.Latest,true),instructions=[];
  function visit(node){if(ts.isPropertyAssignment(node)&&node.name.getText(ast)==='instructions')instructions.push(node.initializer.getText(ast));ts.forEachChild(node,visit);}
  visit(ast);return digest(JSON.stringify(instructions));
}
export function checkMemoCore(){
  const manifest=JSON.parse(readFileSync(resolve(root,'specs/100-memo-submission-recovery/protected-core.json'),'utf8'));
  const transport=JSON.parse(readFileSync(resolve(root,'specs/102-meta-provider-connection/protected-transport.json'),'utf8'));
  function originalTransport(file,source){
    const substitutions=transport.files[file];
    if(!substitutions)return source;
    for(const {before,after,count} of substitutions){
      if(source.split(after).length-1!==count)throw Error('Unexpected provider transport edit: '+file);
      source=source.split(after).join(before);
    }
    return source;
  }
  const changed=Object.entries(manifest.files).filter(([file,hash])=>digest(originalTransport(file,readFileSync(resolve(root,file),'utf8')))!==hash).map(([file])=>file);
  if(instructionDigest(readFileSync(resolve(root,'app/api/legal/memo/route.ts'),'utf8'))!==manifest.memoInstructionsSha256)changed.push('memo model instructions');
  if(changed.length)throw Error('Protected memo source changed: '+changed.join(', '));
  return {baseCommit:manifest.baseCommit,protectedFiles:Object.keys(manifest.files).length,instructionsUnchanged:true};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(checkMemoCore()));
