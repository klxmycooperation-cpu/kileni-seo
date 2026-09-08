import {writeFile} from 'node:fs/promises';
import {chromium,webkit,expect} from '@playwright/test';
const out='docs/user-audit-evidence/final-handoff';
const rows=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch();
  try{
    for(const width of [320,390,430]){
      const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
      const page=await context.newPage();
      page.setDefaultTimeout(12000);
      const row={name,width,values:[],status:'FAIL'};
      try{
        await page.goto('https://kileni-seo.ru/',{waitUntil:'load'});
        await expect(page.locator('html')).toHaveAttribute('data-kileni-intro','done',{timeout:15000});
        await page.getByRole('button',{name:/Только необходимые/}).click();
        const metric=page.locator('.analytics-hero-chart__metric strong');
        await metric.scrollIntoViewIfNeeded();
        row.values.push(await metric.textContent());
        await expect(metric).toHaveText('68%',{timeout:6000});
        row.values.push(await metric.textContent());
        await page.locator('.site-footer').scrollIntoViewIfNeeded();
        await metric.scrollIntoViewIfNeeded();
        await expect(metric).toHaveText('68%');
        row.screenshot=`screenshots/hero-motion-${name}-${width}.jpg`;
        await page.screenshot({path:`${out}/${row.screenshot}`,type:'jpeg',quality:85});
        row.status='PASS';
      }catch(e){row.error=String(e);await page.screenshot({path:`${out}/screenshots/hero-motion-${name}-${width}-failure.jpg`});}
      finally{await context.close();}
      rows.push(row);console.log(name,width,row.status,row.values);
      await writeFile(`${out}/hero-motion.json`,JSON.stringify(rows,null,2));
    }
  }finally{await browser.close();}
}
