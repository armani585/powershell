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
  await page.locator('.topic-card[data-topic="pays"]').click();
  check(await page.locator('.saved-card').count()===20,'twenty country cards');
  const flags=await page.locator('.country-flag').evaluateAll(async nodes=>Promise.all(nodes.map(async node=>{const image=new Image();image.src=node.src;await image.decode();return [image.naturalWidth,image.naturalHeight];})));
  check(flags.length===20&&flags.every(([w,h])=>w>0&&h>0),'all twenty flags decode locally');
  await page.locator('#word-search').fill('Algérie');
  check(await page.locator('.saved-card').getAttribute('data-word')==='country-dz','French country search');
  await page.locator('.saved-card').click();
  check(await page.locator('dialog .country-flag').count()===1,'country detail retains its flag');
  await page.keyboard.press('Escape');
  await page.locator('#word-search').fill('');
  for(const topicId of ['pays','couleurs']){
    await page.locator(`[data-topic="${topicId}"]`).click();
    if(topicId==='couleurs'){
      check(await page.locator('.saved-card').count()===18,'twelve colours plus six feminine forms');
      check(await page.locator('.color-pairs article').count()===6,'six visible agreement pairs');
      const white=await page.locator('.saved-card[data-word="byed-color"] .color-swatch').evaluate(el=>getComputedStyle(el).backgroundColor);
      check(white==='rgb(255, 255, 255)','white swatch is white and has a visible boundary');
      await page.locator('.color-pairs [data-word="7emra"]').click();
      check((await page.locator('dialog .transliteration').textContent())==='7emra','feminine colour pair opens correct pronunciation guide');
      await page.keyboard.press('Escape');
    }
    await page.locator(`[data-word-quiz="${topicId}"]`).click();
    const topic=data.topics.find(t=>t.id===topicId);
    for(let i=0;i<6;i++){
      const heading=await page.locator('.quiz h2').textContent();
      const correct=data.words.find(w=>(topic.colorQuiz||topic.words).includes(w.id)&&heading.includes('« '+w.meaning+' »'));
      const options=await page.locator('[data-word-answer]').evaluateAll(nodes=>nodes.map(el=>el.dataset.wordAnswer));
      check(new Set(options).size===4,'distinct vocabulary choices '+topicId+'/'+i);
      await page.locator(`[data-word-answer="${i===0?options.find(id=>id!==correct.id):correct.id}"]`).click();
      check(await page.locator('[data-word-answer]:disabled').count()===4,'vocabulary locks score '+topicId+'/'+i);
      if(i===0){
        await page.locator('[data-word]').click();
        check(await page.locator('dialog[open]').count()===1,'mistake explanation accessible '+topicId);
        await page.keyboard.press('Escape');
      }
      await page.locator('[data-word-next]').click();
    }
    check((await page.locator('.quiz').textContent()).includes('5 réponses justes sur 6'),'actual vocabulary score '+topicId);
    check(await page.locator('.letter-examples [data-word]').count()===1,'mistaken word retained for revision '+topicId);
    await page.locator(`[data-topic="${topicId}"]`).click();
  }
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'colour cards and pairs fit '+width);
    await page.locator('[data-topic="pays"]').click();
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'country cards fit '+width);
    await page.locator('[data-word="country-gb"]').click();
    check(await page.locator('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),'long country name fits detail '+width);
    await page.keyboard.press('Escape');
    await page.locator('[data-topic="couleurs"]').click();
  }
  await mkdir(new URL('../test-output/',import.meta.url),{recursive:true});
  await page.screenshot({path:new URL('../test-output/colors-mobile.png',import.meta.url).pathname,fullPage:true});
  await page.setViewportSize({width:1440,height:1080});await page.locator('[data-topic="pays"]').click();
  await page.screenshot({path:new URL('../test-output/countries-desktop.png',import.meta.url).pathname,fullPage:true});
  check(errors.length===0,'no exceptions in country and colour workflows');
  console.log(`${count} country and colour browser checks passed.`);
}finally{await browser.close();}
