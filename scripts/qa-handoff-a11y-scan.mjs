import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium,webkit} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const origin=process.env.QA_ORIGIN||'https://kileni-preview.72-56-249-36.sslip.io';
const phase=process.env.QA_BATCH||'a11y-before';
const out=resolve('docs/user-audit-evidence/final-handoff');
const paths=(process.env.QA_PATHS||'/marketplaces/wildberries,/marketplaces/ozon,/marketplaces/yandex-market,/custom-task,/checks,/calculator,/admin/login,/brief').split(',');
const rows=[];
await mkdir(resolve(out,'screenshots',phase),{recursive:true});
for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch();
  for(const path of paths)for(const theme of ['dark','signal','light'])for(const width of [390,1440]){
    const context=await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:'reduce',serviceWorkers:'block'});
    await context.addInitScript(theme=>{localStorage.setItem('kileni:theme:v1',theme);sessionStorage.setItem('kileni:intro:v9','1');localStorage.setItem('kileni-cookie-preferences:v2',JSON.stringify({essential:true,analytics:false,marketing:false,version:'2026-08-23.2'}));},theme);
    const page=await context.newPage();const row={origin,path,engine:engineName,theme,width,errors:[],screenshots:[]};
    page.on('pageerror',e=>row.errors.push(e.message));
    try{
      row.http=(await page.goto(origin+path,{waitUntil:'load',timeout:20000}))?.status();
      await page.waitForTimeout(1600);
      row.violations=(await new AxeBuilder({page}).analyze()).violations.filter(v=>['critical','serious'].includes(v.impact));
      row.overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      const stem=`${engineName}-${theme}-${width}-${path.replaceAll('/','_')}`;
      row.screenshot=`screenshots/${phase}/${stem}.jpg`;
      await page.screenshot({path:resolve(out,row.screenshot),type:'jpeg',quality:85});
      if(engineName==='chromium'&&width===390)for(const [i,v]of row.violations.entries()){
        const seen=new Set();
        for(const [j,node]of v.nodes.entries()){
          const key=node.any.map(a=>a.message).join('|');if(seen.has(key))continue;seen.add(key);
          const target=page.locator(node.target.join(' '));if(await target.count()!==1)continue;
          await target.scrollIntoViewIfNeeded();const screenshot=`screenshots/${phase}/${stem}-${i}-${j}.jpg`;
          await page.screenshot({path:resolve(out,screenshot),type:'jpeg',quality:95});row.screenshots.push({screenshot,target:node.target});
        }
      }
      row.verdict=row.violations.length||row.errors.length||row.overflow>0?'FAIL':'PASS';
    }catch(e){row.verdict='FAIL';row.error=String(e);}finally{await context.close();rows.push(row);await writeFile(resolve(out,`${phase}.json`),JSON.stringify(rows,null,2));}
    console.log(engineName,width,theme,path,row.verdict,row.violations?.map(v=>v.id).join(','));
  }
  await browser.close();
}
