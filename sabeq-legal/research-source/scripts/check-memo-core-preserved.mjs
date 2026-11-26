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
  const isolation=JSON.parse(readFileSync(resolve(root,'specs/103-admin-memo-generation-isolation/protected-case-isolation.json'),'utf8'));
  const classification=JSON.parse(readFileSync(resolve(root,'specs/104-case-classification-audit/protected-classification.json'),'utf8'));
  const sequential=JSON.parse(readFileSync(resolve(root,'specs/105-sequential-memo-review/protected-sequential.json'),'utf8'));
  const project=JSON.parse(readFileSync(resolve(root,'specs/107-memo-project-archive/protected-project.json'),'utf8'));
  const magnitude=JSON.parse(readFileSync(resolve(root,'specs/108-magnitude-provider/protected-transport.json'),'utf8'));
  const style=JSON.parse(readFileSync(resolve(root,'specs/109-memo-drafting-style/protected-style.json'),'utf8'));
  const order=JSON.parse(readFileSync(resolve(root,'specs/111-memo-modified-order/protected-order.json'),'utf8'));
  const contact=JSON.parse(readFileSync(resolve(root,'specs/113-memo-required-contact/protected-contact.json'),'utf8'));
  const quality=JSON.parse(readFileSync(resolve(root,'specs/116-memo-substance-quality/protected-quality.json'),'utf8'));
  const proportionality=JSON.parse(readFileSync(resolve(root,'specs/121-memo-defense-proportionality/protected-quality.json'),'utf8'));
  const search=JSON.parse(readFileSync(resolve(root,'specs/118-explicit-article-section/protected-search.json'),'utf8'));
  const facts=JSON.parse(readFileSync(resolve(root,'specs/119-defendant-payment-facts/protected-facts.json'),'utf8'));
  function originalTransport(file,source){
    const substitutions=[...(proportionality.files[file]||[]),...(quality.files[file]||[]),...(facts.files[file]||[]),...(search.files[file]||[]),...(contact.files[file]||[]),...(order.files[file]||[]),...(style.files[file]||[]),...(magnitude.files[file]||[]),...(project.files[file]||[]),...(sequential.files[file]||[]),...(classification.files[file]||[]),...(isolation.files[file]||[]),...(transport.files[file]||[])];
    for(const {before,after,count} of substitutions){
      if(source.split(after).length-1!==count)throw Error('Unexpected provider transport edit: '+file);
      source=source.split(after).join(before);
    }
    return source;
  }
  const changed=Object.entries(manifest.files).filter(([file,hash])=>digest(originalTransport(file,readFileSync(resolve(root,file),'utf8')))!==hash).map(([file])=>file);
  if(instructionDigest(originalTransport('app/api/legal/memo/route.ts',readFileSync(resolve(root,'app/api/legal/memo/route.ts'),'utf8')))!==manifest.memoInstructionsSha256)changed.push('memo model instructions');
  if(changed.length)throw Error('Protected memo source changed: '+changed.join(', '));
  return {baseCommit:manifest.baseCommit,protectedFiles:Object.keys(manifest.files).length,instructionsUnchanged:true};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(checkMemoCore()));
