import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium,webkit} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const out=resolve('docs/user-audit-evidence/final-handoff');
const results=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch();
  for(const path of ['/marketplaces','/about']){
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
    await context.addInitScript(()=>{localStorage.setItem('kileni:theme:v1','light');sessionStorage.setItem('kileni:intro:v9','1');localStorage.setItem('kileni-cookie-preferences:v2',JSON.stringify({essential:true,analytics:false,marketing:false,version:'2026-08-23.2'}));});
    const page=await context.newPage();
    await page.goto(`https://kileni-seo.ru${path}`,{waitUntil:'load'});
    await page.waitForTimeout(2000);
    const axe=await new AxeBuilder({page}).analyze();
    const row={engine:name,path,violations:axe.violations.filter(v=>['critical','serious'].includes(v.impact))};
    for(const [i,v] of row.violations.entries())for(const [j,node] of v.nodes.entries()){
      const el=page.locator(node.target.join(' '));
      if(await el.count()===1){await el.scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`screenshots/contrast-before-${name}-${path.slice(1)}-${i}-${j}.jpg`),type:'jpeg',quality:95});}
    }
    results.push(row);await context.close();
  }
  await browser.close();
}
await writeFile(resolve(out,'contrast-probe.json'),JSON.stringify(results,null,2));
console.log(results.map(r=>({engine:r.engine,path:r.path,violations:r.violations.map(v=>v.id)})));
