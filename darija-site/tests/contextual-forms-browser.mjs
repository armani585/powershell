import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const data=JSON.parse(await readFile(new URL('../content/learning.json',import.meta.url),'utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
let n=0;function check(value){assert.ok(value);n++;}
try{
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:4174/',{waitUntil:'networkidle'});
 await page.locator('.scene-card[data-start="maison"]').click();
 const opener=page.locator('.phrase-list [data-word="def-kouzina"]');await opener.click();
 check(await page.locator('#dialog-title').textContent()==='الكوزينة');
 await page.locator('dialog [data-part="0"]').click();check((await page.locator('#sound-guide').textContent()).includes('l-'));
 await page.locator('dialog [data-save="def-kouzina"]').click();
 await page.locator('.word-forms [data-word="kouzina"]').click();check(await page.locator('#dialog-title').textContent()==='كوزينة');
 await page.locator('dialog [data-save="kouzina"]').click();
 await page.locator('.word-forms [data-word="def-kouzina"]').click();
 check((await page.locator('dialog [data-save="def-kouzina"]').textContent()).includes('Retirer'));
 await page.keyboard.press('Escape');check(await opener.evaluate(el=>el===document.activeElement));
 // Both forms persist after a page reload and remain independently removable.
 await page.reload({waitUntil:'networkidle'});await page.locator('nav [data-view="reviews"]').click();
 check(await page.locator('.saved-card[data-word="def-kouzina"]').count()===1);check(await page.locator('.saved-card[data-word="kouzina"]').count()===1);
 await page.locator('nav [data-view="dictionary"]').click();
 for(const form of data.words.filter(w=>w.formOf)){
  await page.locator(`#dictionary-grid [data-word="${form.id}"]`).click();
  check(await page.locator(`.word-forms [data-word="${form.formOf}"]`).count()===1);
  await page.keyboard.press('Escape');
 }
 await page.locator('nav [data-view="scenes"]').click();await page.locator('.scene-card[data-start="mall-fitting"]').click();
 check((await page.locator('.phrase-list .latin').allTextContents()).includes('bghit had l-qemija'));
 await page.locator('[data-build]').click();
 while(await page.locator('[data-pick]').count()){
  const indexes=await page.locator('[data-pick]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.pick)).sort((a,b)=>a-b));
  for(const i of indexes)await page.locator(`[data-pick="${i}"]`).click();
  await page.locator('[data-check-order]').click();check((await page.locator('.feedback').textContent()).includes('bon ordre'));
  await page.locator('[data-builder-next]').click();
 }
 await page.locator('nav [data-view="scenes"]').click();await page.locator('[data-nav="reading-guide"]').click();
 check(await page.locator('.expression-card').count()===8);
 await page.locator('main [data-word="def-serwal"]').click();check((await page.locator('dialog .transliteration').textContent())==='s-serwal');
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  check(await page.locator('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
 }
 await mkdir(new URL('../test-output/',import.meta.url),{recursive:true});
 await page.screenshot({path:new URL('../test-output/contextual-form-mobile.png',import.meta.url).pathname});
 await page.keyboard.press('Escape');
 check(errors.length===0);console.log(`${n} contextual form browser checks passed`);
}finally{await browser.close();}
