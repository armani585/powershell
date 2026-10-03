import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const data=JSON.parse(await readFile(new URL('../content/learning.json',import.meta.url),'utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1050}});
let count=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
function check(value,label){assert.ok(value,label);count++;console.log('PASS '+label);}
try{
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  check(await page.locator('.topic-card').count()===29,'twenty-nine illustrated themes featured on home');
  for(const topic of data.topics){
    await page.locator('nav [data-view="dictionary"]').click();
    await page.locator(`[data-topic="${topic.id}"]`).click();
    check(await page.locator('.saved-card').count()===topic.words.length,'complete theme '+topic.id);
    const word=data.words.find(w=>w.id===topic.words[0]);
    await page.locator('#word-search').fill(word.arabic);
    check(await page.locator(`.saved-card[data-word="${word.id}"]`).count()===1,'Arabic search within '+topic.id);
    await page.locator(`.saved-card[data-word="${word.id}"]`).click();
    check(await page.locator('.chunk').count()===word.parts.length,'decomposition in '+topic.id);
    await page.keyboard.press('Escape');
  }
  await page.locator('[data-topic="animaux"]').click();
  check(await page.locator('.animal-card').count()===6,'six animal portraits connected to the correct word cards');
  await page.locator('[data-word="begra"]').click();
  check(await page.locator('dialog .animal-image').count()===1,'animal portrait appears in word details');
  await page.keyboard.press('Escape');
  await page.locator('[data-start="animaux"]').click();
  await page.locator('[data-quiz]').click();
  const animalScene=data.scenes.find(s=>s.id==='animaux');
  for(let i=0;i<4;i++){
    const title=await page.locator('.quiz h2').textContent();
    const phrase=animalScene.phrases.find(p=>title.includes(p.meaning));
    await page.locator(`[data-answer="${phrase.id}"]`).click();
    await page.locator('[data-next]').click();
  }
  check((await page.locator('.quiz').textContent()).includes('4 réponses justes sur 4'),'animal gender and naming quiz completes');
  await page.locator('nav [data-view="dictionary"]').click();
  await page.locator('[data-topic="corps"]').click();
  await page.locator('[data-topic-review="corps"]').click();
  const bodyWords=new Set(data.topics.find(t=>t.id==='corps').words.map(id=>data.words.find(w=>w.id===id).arabic));
  let cards=0;
  while(await page.locator('[data-reveal-review]').count()){
    check(bodyWords.has(await page.locator('.review-arabic').textContent()),'topic revision stays within body vocabulary');
    await page.locator('[data-reveal-review]').click();await page.locator('[data-review-grade="known"]').click();
    if(++cards>8)throw new Error('Topic session must stop after eight cards');
  }
  check(cards===8,'eight-card themed revision completes');
  await page.locator('[data-review-session]').click();
  check(bodyWords.has(await page.locator('.review-arabic').textContent()),'repeat revision preserves theme');
  await page.locator('nav [data-view="scenes"]').click();
  await page.locator('[data-nav="orientation"]').click();
  check(await page.locator('.map-place').count()===8,'eight useful places on accessible map');
  await page.locator('.map-place[data-word="saydaliya"]').click();
  check((await page.locator('#dialog-body').textContent()).includes('pharmacie'),'map opens place vocabulary');
  await page.keyboard.press('Escape');
  check(await page.locator('.map-place[data-word="saydaliya"]').evaluate(el=>el===document.activeElement),'map dialog restores keyboard focus');
  const before=await page.locator('#map-position').textContent();
  await page.locator('[data-move="left"]').click();
  check(await page.locator('#map-position').textContent()===before,'wrong direction does not move learner');
  check((await page.locator('.route-feedback').textContent()).includes('n’a pas changé'),'wrong movement receives explanation');
  check(Number(await page.locator('#review-count').textContent())>0,'mistaken direction enters revisions');
  await page.locator('[data-route-french]').click();
  check((await page.locator('.route-instructions').textContent()).includes('Va tout droit'),'optional French route aid');
  for(const route of data.neighborhood.routes){
    await page.locator('#route-select').selectOption(route.id);
    for(const step of route.steps)await page.locator(`[data-move="${step}"]`).click();
    const target=data.neighborhood.places.find(p=>p.word===route.destination);
    check((await page.locator('#map-position').textContent()).includes(`ligne ${target.y+1}, colonne ${target.x+1}`),'arrive at '+target.label);
    check(await page.locator('.you-are-here [data-word]').getAttribute('data-word')===route.destination,'visual marker agrees for '+target.label);
    check(await page.locator('[data-move]:disabled').count()===3,'completed route cannot advance: '+route.id);
  }
  await page.locator('[data-route-reset]').click();
  check((await page.locator('#map-position').textContent()).includes('ligne 3, colonne 2'),'reset returns to start');
  check(await page.locator('[data-move]:disabled').count()===0,'reset restores controls');
  await mkdir(new URL('../test-output/',import.meta.url),{recursive:true});
  await page.screenshot({path:new URL('../test-output/neighborhood-desktop.png',import.meta.url).pathname,fullPage:true});
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'map fits '+width);
    await page.locator('#route-select').selectOption('market');
    for(const step of ['forward','right','left'])await page.locator(`[data-move="${step}"]`).click();
    check(await page.locator('[data-route-next]').isVisible(),'route usable on mobile '+width);
    await page.locator('[data-topic="reperes"]').click();
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'themed dictionary fits '+width);
    await page.locator('nav [data-view="scenes"]').click();
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'new theme cards fit '+width);
    await page.locator('[data-nav="orientation"]').click();
  }
  await page.screenshot({path:new URL('../test-output/neighborhood-mobile.png',import.meta.url).pathname,fullPage:true});
  check(errors.length===0,'no exceptions in new theme and map workflows');
  console.log(`${count} topic and map browser checks passed.`);
}finally{await browser.close();}
