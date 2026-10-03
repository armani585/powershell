import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let checks=0;function check(v){assert.ok(v);checks++;}
try{
await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.locator('[data-nav="expressions"]').click();check(await page.locator('.expression-card').count()===20);
await page.locator('[data-expression-category="Comprendre"]').click();check(await page.locator('.expression-card').count()===4);
await page.locator('[data-expression-category="all"]').click();await page.locator('#expression-search').fill('douche');check(await page.locator('.expression-card').count()===1);check((await page.locator('.expression-card').textContent()).includes('llah y3tik'));
await page.locator('#expression-search').fill('سمح');check(await page.locator('.expression-card').count()===1);await page.locator('[data-word="sme7"]').click();check(await page.locator('dialog').isVisible());await page.locator('[data-part]').first().click();check((await page.locator('#sound-guide').textContent()).includes('Repère de lecture'));
await page.locator('[data-save="sme7"]').click();check(await page.locator('#review-count').textContent()==='1');await page.keyboard.press('Escape');check(await page.locator('[data-word="sme7"]').evaluate(el=>el===document.activeElement));
await page.locator('#expression-search').fill('introuvable');check(await page.locator('.expression-card').count()===0);check((await page.locator('#expression-list').textContent()).includes('Aucune expression'));
await page.locator('#expression-search').fill('');await page.setViewportSize({width:320,height:800});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));check(await page.locator('.expression-card').count()===20);check(errors.length===0);
console.log(checks+' expression browser checks passed');
}finally{await browser.close();}
