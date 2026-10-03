import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();let count=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));function check(v){assert.ok(v);count++;}
try{
await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.locator('.topic-card[data-topic="famille"]').click();check(await page.locator('.saved-card').count()===26);check(await page.locator('.family-guide .expression-card').count()===10);
await page.locator('.family-guide [data-word="paternal-uncle"]').first().click();check((await page.locator('#dialog-body').textContent()).includes('frère de mon père'));await page.keyboard.press('Escape');
await page.locator('.family-guide [data-word="maternal-uncle"]').first().click();check((await page.locator('#dialog-body').textContent()).includes('frère de ma mère'));await page.keyboard.press('Escape');
await page.locator('#word-search').fill('petite-fille');check(await page.locator('.saved-card').count()===1);await page.locator('.saved-card').click();check(await page.locator('.chunk').count()===3);await page.locator('[data-save="granddaughter"]').click();check(await page.locator('#review-count').textContent()==='1');await page.keyboard.press('Escape');
await page.locator('[data-word-quiz="famille"]').click();check(await page.locator('[data-word-answer]').count()===4);await page.locator('[data-word-answer]').first().click();check(await page.locator('[data-word-next]').count()===1);
await page.locator('.brand').click();await page.locator('.topic-card[data-topic="famille"]').click();await page.locator('[data-start="famille-parents"]').click();check(await page.locator('.phrase').count()===4);await page.locator('[data-quiz="famille-parents"]').click();check(await page.locator('[data-answer]').count()===4);
await page.locator('.brand').click();await page.locator('.topic-card[data-topic="famille"]').click();await page.setViewportSize({width:320,height:800});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));check(errors.length===0);console.log(count+' family browser checks passed');
}finally{await browser.close();}
