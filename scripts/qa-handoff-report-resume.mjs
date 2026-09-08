import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium,webkit,expect} from '@playwright/test';

const out=resolve('docs/user-audit-evidence/final-handoff');
const origin='https://kileni-preview.72-56-249-36.sslip.io';
const token='sVnlokr1Yvqb9v5QMApEgLgkmPsFw6pzo4IGXGrvJyM';
await mkdir(resolve(out,'pdf'),{recursive:true});
const results=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch();
  const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript(()=>{
    sessionStorage.setItem('kileni:intro:v9','1');
    localStorage.setItem('kileni-cookie-preferences:v2',JSON.stringify({essential:true,analytics:false,marketing:false,version:'2026-08-23.2'}));
  });
  const page=await context.newPage();
  const row={engine:name,errors:[],details:[],token};
  page.on('pageerror',e=>row.errors.push(e.message));
  try{
    await page.goto(`${origin}/audit/${token}`,{waitUntil:'domcontentloaded'});
    await expect(page.locator('.audit-complete--client')).toBeVisible({timeout:45000});
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:resolve(out,`screenshots/report-live-${name}-first.jpg`),type:'jpeg',quality:90});
    const api=await context.request.get(`${origin}/api/audits/${token}`);
    const snapshot=await api.json();
    row.summary=snapshot.result.clientPresentationByLocale.ru.summary;
    const all=page.locator('details');
    for(let i=0;i<await all.count();i++){
      const details=all.nth(i);
      const summary=details.locator(':scope > summary');
      if(!await summary.isVisible())continue;
      if(!await details.getAttribute('open'))await summary.click();
      await expect(details).toHaveAttribute('open','');
      row.details.push(await summary.innerText());
      await details.screenshot({path:resolve(out,`screenshots/report-live-${name}-detail-${i}.jpg`),type:'jpeg',quality:85});
    }
    row.webText=await page.locator('main').innerText();
    await writeFile(resolve(out,`pdf/preview-live-web-${name}.txt`),row.webText);
    const presentation=snapshot.result.clientPresentationByLocale.ru;
    row.labelChecks=[presentation.summary.scopeLabel,presentation.summary.checkedLabel,...presentation.pages.flatMap(p=>[p.typeLabel,p.selectionReason]).filter(Boolean)].map(text=>({text,web:row.webText.includes(text)}));
    const pdfLink=page.getByRole('link',{name:/PDF/}).first();
    row.pdfHref=await pdfLink.getAttribute('href');
    const pdf=await context.request.get(new URL(row.pdfHref,origin).href);
    if(!pdf.ok()||!pdf.headers()['content-type']?.includes('pdf'))throw Error(`PDF HTTP ${pdf.status()}`);
    await writeFile(resolve(out,`pdf/preview-live-report-${name}.pdf`),await pdf.body());
    await page.getByRole('link',{name:'Получить полный аудит сайта',exact:true}).first().click();
    await expect(page).not.toHaveURL(new RegExp(`/audit/${token}$`));
    row.nextUrl=page.url();
    await page.screenshot({path:resolve(out,`screenshots/report-live-${name}-next-step.jpg`),fullPage:true,type:'jpeg',quality:85});
    row.status='PASS';
  }catch(e){row.status='FAIL';row.error=String(e);await page.screenshot({path:resolve(out,`screenshots/report-resume-${name}-failure.jpg`),type:'jpeg'}).catch(()=>{});}
  finally{results.push(row);await context.close();await browser.close();await writeFile(resolve(out,'report-live-resume.json'),JSON.stringify(results,null,2));}
  console.log(name,row.status,row.error||'',row.details.length);
}
