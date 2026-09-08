import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
const out=resolve('docs/user-audit-evidence/final-handoff');
const origin='http://localhost:64231';
const browser=await chromium.launch();
const records=[];
await mkdir(resolve(out,'screenshots/final-focused'),{recursive:true});
try{
  for(const width of [390,1440])for(const theme of ['dark','signal','light']){
    const context=await browser.newContext({viewport:{width,height:width===390?844:900},serviceWorkers:'block',reducedMotion:'reduce'});
    await context.addInitScript(theme=>{localStorage.setItem('kileni:theme:v1',theme);sessionStorage.setItem('kileni:intro:v9','1');localStorage.setItem('kileni-cookie-preferences:v2',JSON.stringify({essential:true,analytics:false,marketing:false,version:'2026-08-23.2'}));},theme);
    const page=await context.newPage();
    for(const [path,selector,state] of [['/marketplaces/wildberries','.marketplace-offer[data-selected="true"]','selected-offer'],['/custom-task','.svc-custom-path__intro','inverse-panel'],['/calculator','.estimate-panel','form']]){
      await page.goto(origin+path,{waitUntil:'load'});await page.locator(selector).scrollIntoViewIfNeeded();await page.waitForTimeout(900);
      const screenshot=`screenshots/final-focused/${theme}-${width}-${state}.png`;
      await page.screenshot({path:resolve(out,screenshot)});
      records.push({screenshot,url:origin+path,path,environment:'local candidate',engine:'chromium',viewport:`${width}x${width===390?844:900}`,theme,state,overflow:await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),visualReviewed:false});
    }
    await context.close();
  }
  const parity=JSON.parse(await readFile(resolve(out,'displayed-label-parity.json'),'utf8'));
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage();
  await page.goto(origin+'/admin/login');await page.getByLabel('Логин').fill('e2e-admin');await page.getByLabel('Пароль').fill('Kileni-e2e-password');await page.getByRole('button',{name:'Войти'}).click();await page.waitForURL(origin+'/admin');
  await page.goto(origin+'/admin/audits/'+parity[0].auditId);await page.locator('p.admin-muted').filter({hasText:'Юридические и служебные страницы'}).scrollIntoViewIfNeeded();
  const screenshot='admin/candidate-summary-after.png';await page.screenshot({path:resolve(out,screenshot)});
  records.push({screenshot,url:page.url(),environment:'local candidate',engine:'chromium',viewport:'1440x900',theme:'dark',state:'client-summary-exclusion',visualReviewed:false});await context.close();
}finally{await browser.close();await writeFile(resolve(out,'focused-screenshots.json'),JSON.stringify(records,null,2));}
