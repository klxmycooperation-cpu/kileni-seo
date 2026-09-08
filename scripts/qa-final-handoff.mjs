import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Read-only production inspection. No forms are submitted by this harness.
const origin = process.env.QA_ORIGIN || 'https://kileni-seo.ru';
const out = resolve(process.env.QA_OUTPUT_DIR || 'docs/user-audit-evidence/final-handoff');
const phase = process.env.QA_PHASE || 'clean';
const batch = process.env.QA_BATCH ? `-${process.env.QA_BATCH}` : '';
const token = '-PT6rbtFQvPyf_ndAtMPk9wcRKGvjNNypzw19VQ2tiw';
const inventory = JSON.parse(await readFile(resolve(out, 'inventory-production/inventory.json'), 'utf8'));
const core = ['/', '/services', '/seo', '/seo-audit', '/seo-promotion', '/pricing', '/free-audit', '/brief', '/web-development', '/marketplaces', '/marketplaces/wildberries', '/marketplaces/ozon', '/marketplaces/yandex-market', '/custom-task', '/yandex-ads', '/cases', '/cases/eco-santeh', '/cases/zasorservice', '/blog', '/blog/seo-audit-when-you-need-it', '/blog/website-speed-loading', '/blog/seo-promotion-cost', '/glossary', '/glossary/lighthouse', '/glossary/core-web-vitals', '/checks', '/checks/http-status', '/about', '/contacts', '/privacy', '/consent', '/calculator', '/content-materials', '/en', '/en/services', '/en/pricing', '/en/brief', '/en/free-audit', '/en/blog/seo-audit-when-you-need-it', '/admin', '/final-handoff-page-does-not-exist', `/audit/${token}`];
const sizes = [[320,720],[360,800],[390,844],[430,932],[768,1024],[1024,768],[1280,800],[1440,900]];
const filters = (process.env.QA_PATHS || '').split(',').filter(Boolean);
const excluded = (process.env.QA_EXCLUDE_PATHS || '').split(',').filter(Boolean);
const paths = (phase === 'inventory' ? inventory.filter(r=>r.classification==='HTML').map(r=>new URL(r.requestedUrl).pathname+new URL(r.requestedUrl).search) : core).filter(p=>(!filters.length||filters.includes(p))&&!excluded.includes(p));
const engines = phase === 'matrix' ? [['chromium',chromium],['webkit',webkit]] : [[process.env.QA_ENGINE || 'chromium', process.env.QA_ENGINE === 'webkit' ? webkit : chromium]];
await mkdir(resolve(out,'screenshots'), {recursive:true});
const results = [];
const json = (file, data)=>writeFile(resolve(out,file), JSON.stringify(data,null,2)+'\n');
const csv = (rows,keys)=>[keys,...rows.map(r=>keys.map(k=>typeof r[k]==='object'?JSON.stringify(r[k]):r[k]))].map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n')+'\n';
for (const [engineName,engine] of engines) {
  const browser = await engine.launch();
  try {
    for (const [width,height] of phase==='matrix'?sizes:[[1440,900]]) {
      for (const theme of phase==='matrix'?['dark','signal','light']:['dark']) {
        for (const path of paths) {
          const viewport = `${width}x${height}`;
          const name = `${phase}${batch}-${engineName}-${theme}-${viewport}-${path.replace(/[^a-z0-9-]/gi,'_').slice(0,105)||'home'}`;
          const context = await browser.newContext({viewport:{width,height},serviceWorkers:'block',reducedMotion:phase==='matrix'?'reduce':'no-preference'});
          // Clean phase is truly pristine. Matrix state is explicit and reproducible.
          if (phase!=='clean') await context.addInitScript(t=>{
            localStorage.setItem('kileni:theme:v1',t);
            sessionStorage.setItem('kileni:intro:v9','1');
            localStorage.setItem('kileni-cookie-preferences:v2',JSON.stringify({essential:true,analytics:false,marketing:false,version:'2026-08-23.2'}));
          },theme);
          const page = await context.newPage();
          const row = {path,url:new URL(path,origin).href,engine:engineName,viewport,theme,state:phase==='clean'?'fresh-session':'default',status:null,console:[],pageErrors:[],failed:[],responses:[],overflow:null,brokenImages:[],serious:[],screenshot:`screenshots/${name}.jpg`,visualReviewed:false,verdict:'FAIL'};
          page.on('console',m=>{if(m.type()==='error')row.console.push(m.text());});
          page.on('pageerror',e=>row.pageErrors.push(e.message));
          page.on('requestfailed',r=>row.failed.push({url:r.url(),type:r.resourceType(),error:r.failure()?.errorText}));
          page.on('response',r=>row.responses.push({url:r.url(),type:r.request().resourceType(),status:r.status(),fromServiceWorker:r.fromServiceWorker()}));
          try {
            const response = await page.goto(row.url,{waitUntil:'load',timeout:45000});
            row.status = response?.status();
            await page.evaluate(()=>document.fonts.ready);
            if (phase==='clean') await page.waitForTimeout(4600);
            else await page.waitForTimeout(300);
            await page.evaluate(async()=>{
              for(const el of document.querySelectorAll('img[loading="lazy"]')) el.loading='eager';
              await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));
            });
            Object.assign(row,await page.evaluate(()=>({
              overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
              h1:[...document.querySelectorAll('h1')].map(e=>e.textContent?.trim()),
              css:document.styleSheets.length,
              brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.currentSrc||i.src),
              actualTheme:document.documentElement.dataset.theme,
              mainText:document.querySelector('main')?.textContent?.trim().slice(0,16000),
              bodyTextLength:document.body.innerText.length,
              animationCounters:[...document.querySelectorAll('.analytics-metric__value,[data-count]')].map(e=>e.textContent),
            })));
            if (phase==='matrix' && [390,1440].includes(width)) {
              const axe = await new AxeBuilder({page}).analyze();
              row.serious = axe.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));
              row.otherAxe = axe.violations.filter(v=>!['serious','critical'].includes(v.impact)).map(v=>({id:v.id,impact:v.impact}));
            }
            await page.screenshot({path:resolve(out,row.screenshot),type:'jpeg',quality:75,fullPage:phase==='clean'||([390,1440].includes(width)),animations:'disabled'});
            const expected404 = path==='/final-handoff-page-does-not-exist';
            row.unexpectedResponses=row.responses.filter(r=>r.status>=400&&!(expected404&&r.type==='document'));
            row.expectedConsole=expected404?row.console.filter(m=>/Failed to load resource.*404/.test(m)):[];
            row.verdict=(row.status===(expected404?404:200)&&row.overflow===0&&!row.pageErrors.length&&!row.brokenImages.length&&!row.serious.length&&!row.unexpectedResponses.length&&row.console.length===row.expectedConsole.length)?'PASS':'FAIL';
            // PASS here means automated assertions only; visualReviewed remains false.
          } catch(e) {row.error=String(e);}
          finally {await context.close();}
          results.push(row);
          await json(`${phase}${batch}-${engineName}-results.json`,results.filter(r=>r.engine===engineName));
          console.log(`${results.length} ${engineName} ${viewport} ${theme} ${path} ${row.verdict} HTTP=${row.status} overflow=${row.overflow} assets=${row.brokenImages.length} errors=${row.console.length+row.pageErrors.length} axe=${row.serious.length}`);
        }
      }
    }
  } finally {await browser.close();}
}
await json(`${phase}${batch}-summary.json`,{generatedAt:new Date().toISOString(),origin,phase,count:results.length,automatedFailures:results.filter(r=>r.verdict==='FAIL').map(r=>Object.fromEntries(Object.entries(r).filter(([key])=>!['mainText','responses'].includes(key)))),manualVisualReviewRequired:true});
await writeFile(resolve(out,`${phase}${batch}-browser-matrix.csv`),csv(results,['path','engine','viewport','theme','state','status','overflow','verdict','visualReviewed','screenshot']));
