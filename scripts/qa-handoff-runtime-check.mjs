import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const base=process.cwd(),out=resolve(base,'docs/user-audit-evidence/final-handoff/release');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function walk(dir){const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(entry.isDirectory())result.push(...await walk(path));else if(entry.isFile())result.push(path);}return result;}
const mismatches=[],files=[];
for(const sourceDir of ['public','.next/static'])for(const source of await walk(resolve(base,sourceDir))){
  const name=relative(base,source),destination=resolve(base,'.next/standalone',name);
  const original=await readFile(source);let same=false;
  try{same=hash(original)===hash(await readFile(destination));}catch{}
  files.push({path:name,bytes:original.length,sha256:hash(original),packaged:same});if(!same)mismatches.push(name);
}
const sourceFiles=['app/theme.css','app/compact-redesign.css','app/content-navigation.css','app/admin/admin.css','app/admin/audits/[id]/page.tsx','src/components/forms/Calculator.tsx','src/components/pages/MarketplacePage.tsx','src/components/pages/MarketplaceOfferSelector.tsx','src/db/client.ts','src/db/transport.ts'];
const changed=[];for(const name of sourceFiles){try{const content=await readFile(resolve(base,name));changed.push({path:name,sha256:hash(content)});}catch{}}
const manifest={generatedAt:new Date().toISOString(),environment:'local isolated candidate; not deployed',baseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),branch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),buildId:(await readFile(resolve(base,'.next/BUILD_ID'),'utf8')).trim(),workingDiffSha256:hash(execFileSync('git',['diff','--binary'],{maxBuffer:50_000_000})),filesCount:files.length,totalBytes:files.reduce((sum,row)=>sum+row.bytes,0),mismatches,changedSourceHashes:changed,assets:files};
await writeFile(resolve(out,'candidate-runtime-manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({buildId:manifest.buildId,files:files.length,mismatches:mismatches.length,totalBytes:manifest.totalBytes}));
if(mismatches.length)process.exitCode=1;
