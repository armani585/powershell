import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();let count=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));function check(v){assert.ok(v);count++;}
try{
await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle'});
for(const [id,n] of [['immobilier-notaire',26]]){
 await page.locator('.brand').click();await page.locator('.topic-card[data-topic="'+id+'"]').click();check(await page.locator('.saved-card').count()===n);
 await page.locator('.saved-card').first().click();check(await page.locator('.chunk').count()>1);await page.keyboard.press('Escape');
 await page.locator('[data-word-quiz="'+id+'"]').click();check(await page.locator('[data-word-answer]').count()===4);await page.locator('[data-word-answer]').first().click();check(await page.locator('[data-word-next]').count()===1);
 await page.locator('.brand').click();await page.locator('.topic-card[data-topic="'+id+'"]').click();await page.setViewportSize({width:320,height:800});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('[data-start="'+id+'"]').click();check(await page.locator('.phrase').count()===4);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
}
await page.locator('.brand').click();await page.locator('.topic-card[data-topic="immobilier-notaire"]').click();
check(await page.locator('.topic-actions [data-start]').count()===3);
for(const id of ['property-documents','property-clarify']){
 await page.locator('.brand').click();await page.locator('.topic-card[data-topic="immobilier-notaire"]').click();await page.locator('[data-start="'+id+'"]').click();check(await page.locator('.phrase').count()===4);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
}
check(errors.length===0);console.log(count+' property browser checks passed');
}finally{await browser.close();}
