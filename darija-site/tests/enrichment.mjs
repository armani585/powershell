import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const data=JSON.parse(await readFile(new URL('../content/learning.json',import.meta.url),'utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:960}});
let count=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
function check(value,label){assert.ok(value,label);count++;console.log('PASS '+label);}
try{
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#scene-search').fill('hotel');
  check(await page.locator('.scene-card').count()===1,'accent-insensitive scene search');
  check(await page.locator('.scene-card').getAttribute('data-start')==='hotel','correct search result');
  await page.locator('#scene-search').fill('xxxxxxxx');
  check(await page.locator('.no-results').isVisible(),'search empty state');
  await page.locator('[data-clear-search]').click();
  await page.locator('[data-category="deplacements"]').click();
  check(await page.locator('.scene-card').count()===9,'category filters combined content');
  await page.locator('[data-category="all"]').click();
  check(await page.locator('.scene-card').count()===63,'all sixty-three situations remain accessible');
  await page.locator('nav [data-view="dictionary"]').click();
  check(await page.locator('.saved-card').count()===581,'full 581-word dictionary');
  await page.locator('#word-search').fill('شكرا');
  check(await page.locator('.saved-card').count()===1,'unvocalized Arabic dictionary search');
  await page.locator('.saved-card').click();
  check(await page.locator('dialog[open]').count()===1,'dictionary opens word decomposition');
  await page.keyboard.press('Escape');
  await page.locator('nav [data-view="scenes"]').click();
  for(const scene of data.scenes.filter(s=>s.dialogue)){
    await page.locator(`.scene-card[data-start="${scene.id}"]`).click();
    await page.locator('[data-dialogue]').click();
    check(await page.locator('.dialogue-turn').count()===1,'progressive dialogue starts: '+scene.id);
    for(let i=0;i<3;i++)await page.locator('[data-dialogue-next]').click();
    check(await page.locator('.dialogue-turn').count()===4,'dialogue reaches all four turns: '+scene.id);
    await page.locator('.dialogue-turn details').first().locator('summary').click();
    check(await page.locator('.dialogue-turn details').first().getAttribute('open')!==null,'meaning can be revealed: '+scene.id);
    await page.locator('nav [data-view="scenes"]').click();
  }
  await page.locator('.scene-card[data-start="transports"]').click();
  await page.locator('[data-build]').click();
  const indexes=await page.locator('[data-pick]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.pick)).sort((a,b)=>b-a));
  check(await page.locator('[data-check-order]').isDisabled(),'incomplete sentence cannot be submitted');
  for(const index of indexes)await page.locator(`[data-pick="${index}"]`).click();
  await page.locator('[data-check-order]').click();
  check((await page.locator('.feedback').textContent()).includes('Pas encore'),'wrong word order receives feedback');
  check(Number(await page.locator('#review-count').textContent())>0,'sentence mistakes add review words');
  for(let i=0;i<indexes.length;i++)await page.locator('[data-unpick]').first().click();
  check(await page.locator('[data-pick]:not(:disabled)').count()===indexes.length,'removing words restores every token');
  await page.locator('[data-order-help]').click();
  for(const index of [...indexes].reverse())await page.locator(`[data-pick="${index}"]`).click();
  await page.locator('[data-check-order]').click();
  check((await page.locator('.feedback').textContent()).includes('avec un indice'),'assisted success is identified honestly');
  check(await page.locator('[data-builder-next]').isVisible(),'correct reconstruction advances');
  // Complete the remaining phrases without relying on their shuffled order.
  while(await page.locator('[data-builder-next]').count()){
    await page.locator('[data-builder-next]').click();
    if(!await page.locator('[data-pick]').count())break;
    const remaining=await page.locator('[data-pick]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.pick)).sort((a,b)=>a-b));
    for(const index of remaining)await page.locator(`[data-pick="${index}"]`).click();
    await page.locator('[data-check-order]').click();
  }
  check(await page.locator('.phrase-list').count()===1,'builder completes and returns to situation');
  await page.locator('nav [data-view="reviews"]').click();
  await page.locator('[data-review-session]').click();
  check(await page.locator('[data-review-grade]').count()===0,'review hides answers and self-grading until reveal');
  const first=await page.locator('.review-arabic').textContent();
  await page.locator('[data-reveal-review]').click();await page.locator('[data-review-grade="again"]').click();
  let repeats=0,rounds=0;
  while(await page.locator('[data-reveal-review]').count()){
    if(await page.locator('.review-arabic').textContent()===first)repeats++;
    await page.locator('[data-reveal-review]').click();await page.locator('[data-review-grade="known"]').click();
    if(++rounds>16)throw new Error('Unbounded review session');
  }
  check(repeats===1,'difficult review card returns once');
  check((await page.locator('.quiz h1').textContent()).includes('terminée'),'review reaches a finite completion');
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});await page.locator('nav [data-view="scenes"]').click();
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'filters and navigation fit '+width);
    await page.locator('.scene-card[data-start="marche"]').click();await page.locator('[data-build]').click();
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'word builder fits '+width);
  }
  check(errors.length===0,'no JavaScript errors in added workflows');
  console.log(`${count} enrichment browser checks passed.`);
}finally{await browser.close();}
