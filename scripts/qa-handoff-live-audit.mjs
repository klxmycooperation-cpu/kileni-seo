import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';

const origin='https://kileni-preview.72-56-249-36.sslip.io';
const out=resolve('docs/user-audit-evidence/final-handoff');
const run=process.env.QA_RUN||'live';
await mkdir(resolve(out,'videos'),{recursive:true});
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',recordVideo:{dir:resolve(out,'videos'),size:{width:1440,height:900}}});
const page=await context.newPage();
page.setDefaultTimeout(15000);
const log={origin,startedAt:new Date().toISOString(),states:[],errors:[],responses:[],audit:null};
page.on('pageerror',e=>log.errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)log.responses.push({url:r.url(),status:r.status()});});
let created;
const creation=new Promise(resolveCreation=>{created=resolveCreation;});
// This is a real worker run, not a response fixture. Only QA attribution and
// the existing forceFresh switch are added so cache cannot hide the workflow.
await page.route(`${origin}/api/audits`,async route=>{
  if(route.request().method()!=='POST')return route.continue();
  await route.continue({postData:JSON.stringify({...route.request().postDataJSON(),source:'playwright-final-handoff',forceFresh:true})});
});
page.on('response',async r=>{if(r.url()===`${origin}/api/audits`&&r.request().method()==='POST'){try{created({status:r.status(),body:await r.json()});}catch(e){created({error:String(e)});}}});
let index=0;
async function shot(state){const filename=`screenshots/${run}-${String(++index).padStart(2,'0')}-${state}.jpg`;await page.screenshot({path:resolve(out,filename),quality:85,type:'jpeg'});log.states.push({state,at:new Date().toISOString(),url:page.url(),screenshot:filename});console.log(state);await save();}
async function save(){await writeFile(resolve(out,`${run}-preview-audit.json`),JSON.stringify(log,null,2));}
try{
  await page.goto(origin,{waitUntil:'load'});
  const skip=page.getByRole('button',{name:'Пропустить заставку',exact:true});
  await skip.waitFor({state:'visible',timeout:8000}).catch(()=>{});
  if(await skip.isVisible())await skip.click();
  await expect(page.locator('html')).toHaveAttribute('data-kileni-intro','done',{timeout:12000});
  const necessary=page.getByRole('button',{name:/Только необходимые/i});
  await necessary.waitFor({state:'visible'});
  await shot('cookie-first-visit');
  await necessary.click();
  await shot('home');
  await page.locator('a[href="#free-check"]').first().click();
  await expect(page).toHaveURL(/#free-check$/);
  await page.locator('#audit-url').fill('https://kileni-seo.ru');
  await shot('url-entered');
  await page.locator('form').filter({has:page.locator('#audit-url')}).getByRole('button').filter({hasText:/Узнать|Проверить/}).first().click();
  await expect(page.locator('input[name="authority"]')).toBeVisible();
  await shot('email-optional-consent');
  await page.locator('input[name="authority"]').check();
  await page.getByRole('button',{name:'Запустить проверку',exact:true}).click();
  log.audit=await Promise.race([creation,new Promise((_,reject)=>setTimeout(()=>reject(Error('No audit creation response')),45000))]);
  await save();
  if(log.audit.status!==200&&log.audit.status!==201&&log.audit.status!==202)throw Error(`Audit creation failed: ${JSON.stringify(log.audit)}`);
  await page.getByRole('button',{name:'Свернуть',exact:true}).waitFor({timeout:20000});
  await shot('connection');
  await page.getByRole('button',{name:'Свернуть',exact:true}).click();
  await shot('minimized');
  await page.getByRole('button',{name:'Открыть ход проверки',exact:true}).click();
  await shot('restored');
  await page.reload({waitUntil:'domcontentloaded'});
  await shot('reloaded');
  let last='';
  const deadline=Date.now()+8*60*1000;
  while(Date.now()<deadline){
    const completed=await page.locator('.audit-complete--client').isVisible();
    if(completed){await shot('completed');break;}
    const state=await page.locator('.audit-live h1,.audit-live h2').allTextContents();
    const next=state.join(' ');
    if(next&&next!==last){last=next;await shot(`stage-${index}`);log.states.at(-1).heading=next;}
    if(await page.getByRole('heading',{name:'Проверку не удалось завершить',exact:true}).isVisible())throw Error('Live audit failed');
    await page.waitForTimeout(1500);
  }
  await expect(page.locator('.audit-complete--client')).toBeVisible();
  const token=new URL(page.url()).pathname.split('/').at(-1);
  const api=await context.request.get(`${origin}/api/audits/${token}`);
  await writeFile(resolve(out,'pdf/preview-live-api.json'),await api.body());
  log.resultUrl=page.url();
  log.token=token;
  for(const details of await page.locator('details').all()){
    await details.locator(':scope > summary').click();
    await shot(`details-${index}`);
    await details.locator(':scope > summary').click();
  }
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('link',{name:/PDF/}).first().click();
  const download=await downloadPromise;
  await download.saveAs(resolve(out,'pdf/preview-live-report.pdf'));
  await page.getByRole('link',{name:'Получить полный аудит сайта',exact:true}).click();
  await shot('paid-next-step');
  log.result='PASS';
}catch(e){log.result='FAIL';log.error=String(e);await shot('failure').catch(()=>{});}
finally{await save();await context.close();await browser.close();}
if(log.result!=='PASS')process.exitCode=1;
