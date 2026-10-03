import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const data=JSON.parse(await readFile(new URL('../content/learning.json',import.meta.url),'utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1080}});
let count=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
function check(value,label){assert.ok(value,label);count++;console.log('PASS '+label);}
try{
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.setItem('darija-enrichment-review-v1','["korsi"]'));
  await page.reload({waitUntil:'networkidle'});
  await page.locator('.topic-card[data-topic="mobilier"]').click();
  check(await page.locator('.saved-card').count()===18,'eighteen furniture and furnishing entries');
  check(await page.locator('.saved-card .furniture-image').count()===6,'six furniture portraits');
  check(await page.locator('#review-count').textContent()==='1','existing chair bookmark preserved');
  await page.locator('.saved-card[data-word="biro"]').click();
  check((await page.locator('#dialog-body').textContent()).includes('table de travail'),'desk ambiguity explained');
  check(await page.locator('dialog .furniture-image').count()===1,'desk portrait appears in detail');
  await page.locator('.chunk').first().click();
  check((await page.locator('#sound-guide').textContent()).includes('Repère de lecture'),'furniture reading groups remain interactive');
  await page.keyboard.press('Escape');
  await page.locator('nav [data-view="reviews"]').click();await page.locator('[data-review-session]').click();
  check(await page.locator('.review-flashcard .furniture-image').count()===0,'recognition image hidden before recall');
  await page.locator('[data-reveal-review]').click();
  check(await page.locator('.review-flashcard .furniture-image').count()===1,'recognition image appears after recall');
  await page.locator('[data-review-grade="known"]').click();
  await page.locator('nav [data-view="dictionary"]').click();await page.locator('[data-topic="mobilier"]').click();
  await page.locator('#word-search').fill('armoire');
  check(await page.locator('.saved-card').getAttribute('data-word')==='mariyo','furniture search is scoped correctly');
  await page.locator('#word-search').fill('');
  await page.locator('[data-word-quiz="mobilier"]').click();
  const topic=data.topics.find(t=>t.id==='mobilier');let mistake;
  for(let i=0;i<6;i++){
    const title=await page.locator('.quiz h2').textContent();
    const correct=data.words.find(w=>topic.words.includes(w.id)&&title.includes('« '+w.meaning+' »'));
    const options=await page.locator('[data-word-answer]').evaluateAll(nodes=>nodes.map(el=>el.dataset.wordAnswer));
    check(new Set(options).size===4,'distinct furniture quiz options '+i);
    if(i===0)mistake=correct.id;
    await page.locator(`[data-word-answer="${i===0?options.find(id=>id!==correct.id):correct.id}"]`).click();
    await page.locator('[data-word-next]').click();
  }
  check((await page.locator('.quiz').textContent()).includes('5 réponses justes sur 6'),'furniture score tracks actual answers');
  check(await page.evaluate(id=>JSON.parse(localStorage.getItem('darija-enrichment-review-v1')).includes(id),mistake),'mistaken furniture word saved for revision');
  await page.locator('[data-topic="mobilier"]').click();await page.locator('[data-start="mobilier"]').click();
  check(await page.locator('.phrase').count()===4,'four furniture situation phrases');
  await page.locator('[data-build]').click();
  const indexes=await page.locator('[data-pick]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.pick)).sort((a,b)=>a-b));
  for(const index of indexes)await page.locator(`[data-pick="${index}"]`).click();await page.locator('[data-check-order]').click();
  check((await page.locator('.feedback').textContent()).includes('bon ordre'),'furniture sentence reconstruction works');
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    await page.locator('nav [data-view="dictionary"]').click();await page.locator('[data-topic="mobilier"]').click();
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'furniture cards fit '+width);
    await page.locator('.saved-card[data-word="namousiya"]').click();
    check(await page.locator('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),'illustrated furniture detail fits '+width);
    await page.keyboard.press('Escape');
  }
  await mkdir(new URL('../test-output/',import.meta.url),{recursive:true});
  await page.screenshot({path:new URL('../test-output/furniture-mobile.png',import.meta.url).pathname,fullPage:true});
  check(errors.length===0,'no exceptions in furniture workflows');
  console.log(`${count} furniture browser checks passed.`);
}finally{await browser.close();}
