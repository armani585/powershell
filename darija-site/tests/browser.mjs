import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const data=JSON.parse(await readFile(new URL('../content/learning.json',import.meta.url),'utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1080}});
const page=await context.newPage();
const errors=[];page.on('pageerror',err=>errors.push(err.message));
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;console.log('PASS '+message);};
try{
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  check(await page.locator('.scene-card').count()===63,'sixty-three illustrated scenes render');
  for(const name of ['daily-scenes.png','alphabet-objects.png','more-scenes.png','vocabulary-scenes.png','animals.png','countries-colors.png','furniture.png']){
    const image=await page.evaluate(async name=>{const i=new Image();i.src='./illustrations/'+name;await i.decode();return [i.naturalWidth,i.naturalHeight];},name);
    check(image[0]>1000&&image[1]>500,'generated asset decodes: '+name);
  }
  await mkdir(new URL('../test-output/',import.meta.url),{recursive:true});
  await page.screenshot({path:new URL('../test-output/desktop.png',import.meta.url).pathname,fullPage:true});
  await page.locator('nav [data-view="alphabet"]').click();
  check(await page.locator('.letter-card').count()===28,'28 interactive letters');
  await page.locator('[data-letter="letter-1"]').click();
  check(await page.locator('dialog[open] .forms .missing').count()===2,'alif has no misleading initial/medial joining shape');
  await page.keyboard.press('Escape');
  check(await page.locator('[data-letter="letter-1"]').evaluate(e=>document.activeElement===e),'Escape restores opener focus');
  await page.locator('.object-card[data-word="bab"]').click();
  check(await page.locator('.chunk').count()===3,'door decomposes into three written groups');
  await page.locator('.chunk').first().click();
  check((await page.locator('#sound-guide').textContent()).includes('ba'),'chunk explains letter name');
  await page.locator('[data-save="bab"]').click();
  check(await page.locator('#review-count').textContent()==='1','bookmark count updates');
  await page.keyboard.press('Escape');
  await page.reload({waitUntil:'networkidle'});
  check(await page.locator('#review-count').textContent()==='1','bookmark persists after reload');
  await page.locator('.scene-card[data-start="directions"]').click();
  await page.locator('[data-translations]').click();
  check(await page.locator('.hidden-meaning').count()===4,'French meanings can be hidden');
  await page.locator('[data-quiz]').click();
  const scene=data.scenes.find(s=>s.id==='directions');
  for(let i=0;i<4;i++){
    const heading=await page.locator('.quiz h2').textContent();
    const q=scene.phrases.find(p=>heading.includes(p.meaning));assert.ok(q);
    const chosen=i===0?scene.phrases.find(p=>p.id!==q.id).id:q.id;
    await page.locator(`[data-answer="${chosen}"]`).click();
    check(await page.locator('[data-answer]:disabled').count()===4,'answer locks to prevent double scoring '+i);
    if(i===0)check((await page.locator('.feedback').textContent()).includes('À revoir'),'wrong answer receives explanation');
    await page.locator('[data-next]').click();
  }
  check((await page.locator('.quiz').textContent()).includes('3 réponses justes sur 4'),'quiz completes with actual score');
  check(Number(await page.locator('#review-count').textContent())>1,'mistake words added to review list');
  await page.locator('nav [data-view="reviews"]').click();
  check(await page.locator('.saved-card').count()>1,'review list displays saved words');
  await page.locator('nav [data-view="scenes"]').click();
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal page overflow at '+width);
    await page.locator('nav [data-view="alphabet"]').click();
    await page.locator('[data-letter="letter-18"]').click();
    check(await page.locator('dialog').evaluate(e=>e.scrollWidth<=e.clientWidth),'word/letter dialog fits at '+width);
    await page.keyboard.press('Escape');
    await page.locator('nav [data-view="scenes"]').click();
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:new URL('../test-output/mobile.png',import.meta.url).pathname,fullPage:true});
  await page.evaluate(()=>localStorage.setItem('darija-enrichment-review-v1','{broken'));
  await page.reload({waitUntil:'networkidle'});
  check(await page.locator('#notice').isVisible(),'corrupt storage is explained');
  await page.locator('nav [data-view="alphabet"]').click();await page.locator('.object-card[data-word="bab"]').click();await page.locator('[data-save="bab"]').click();
  check(await page.evaluate(()=>localStorage.getItem('darija-enrichment-review-v1'))==='{broken','corrupt storage is never overwritten');
  check(errors.length===0,'no browser JS exceptions');
  console.log(`${checks} browser checks passed.`);
}finally{await browser.close();}
