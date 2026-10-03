import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const failures=[];page.on('pageerror',e=>failures.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(r.url()+' '+r.status());});
 const base=process.env.BASE_URL||'http://127.0.0.1:4180/';
 await page.goto(base,{waitUntil:'networkidle'});
 assert.equal(await page.locator('.scene-card').count(),63);
 assert.equal(await page.locator('nav [data-view="paths"]').count(),1);
 const release=await (await page.request.get(new URL('release.json',base).href)).json();
 assert.equal(release.words,581);assert.equal(release.contentVersion,29);
 const images=await page.evaluate(()=>[...document.querySelectorAll('.sprite')].map(el=>getComputedStyle(el).backgroundImage));
 assert.ok(images.some(value=>value.includes('.webp')));
 for(const name of ['daily-scenes','alphabet-objects','more-scenes','vocabulary-scenes','animals','countries-colors','furniture']){
  const response=await page.request.get(new URL('illustrations/'+name+'.webp',base).href);assert.equal(response.status(),200);
  const bytes=await response.body();assert.equal(bytes.subarray(8,12).toString(),'WEBP');
 }
 await page.locator('.scene-card[data-start="maison"]').click();
 await page.locator('.phrase-list [data-word="def-kouzina"]').click();
 assert.equal(await page.locator('#dialog-title').textContent(),'الكوزينة');
 await page.keyboard.press('Escape');await page.locator('.brand').click();
 assert.equal(await page.locator('.scene-card').count(),63);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await mkdir(new URL('../test-output/',import.meta.url),{recursive:true});
 await page.screenshot({path:new URL('../test-output/independent-site-mobile.png',import.meta.url).pathname,fullPage:false});
 assert.deepEqual(failures,[]);
 console.log('Production site verified: release, all WebP resources, home, contextual word, navigation, mobile, no errors or 404s.');
}finally{await browser.close();}
