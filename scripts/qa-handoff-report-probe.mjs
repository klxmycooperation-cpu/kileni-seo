import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const out=resolve('docs/user-audit-evidence/final-handoff');
const browser=await chromium.launch();
const results=[];
for(const [label,url] of [['production','https://kileni-seo.ru/audit/-PT6rbtFQvPyf_ndAtMPk9wcRKGvjNNypzw19VQ2tiw'],['preview','https://kileni-preview.72-56-249-36.sslip.io/audit/sVnlokr1Yvqb9v5QMApEgLgkmPsFw6pzo4IGXGrvJyM']]){
  const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
  const page=await context.newPage();const pending=new Set();const row={label,url,start:new Date().toISOString(),responses:[],errors:[]};const start=Date.now();
  page.on('request',r=>pending.add(r.url()));page.on('requestfinished',r=>pending.delete(r.url()));page.on('requestfailed',r=>pending.delete(r.url()));page.on('response',r=>row.responses.push({url:r.url(),status:r.status(),ms:Date.now()-start}));page.on('pageerror',e=>row.errors.push(e.message));
  try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});row.domMs=Date.now()-start;await page.waitForLoadState('load',{timeout:15000}).catch(e=>row.loadError=String(e));row.loadMs=Date.now()-start;row.pending=[...pending];row.main=await page.locator('main').innerText();row.axe=(await new AxeBuilder({page}).analyze()).violations.filter(v=>['serious','critical'].includes(v.impact));await page.screenshot({path:resolve(out,`screenshots/report-probe-${label}.jpg`),type:'jpeg',quality:90});}catch(e){row.error=String(e);}finally{await context.close();results.push(row);}
}
await browser.close();await writeFile(resolve(out,'report-probe.json'),JSON.stringify(results,null,2));console.log(results.map(r=>({label:r.label,dom:r.domMs,load:r.loadMs,error:r.error,pending:r.pending,axe:r.axe?.map(v=>v.id)})));
