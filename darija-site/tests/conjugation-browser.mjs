import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {conjugatedForm} from '../learning.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const data=JSON.parse(await readFile(new URL('../content/learning.json',import.meta.url),'utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1080}});
let count=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
function check(value,label){assert.ok(value,label);count++;console.log('PASS '+label);}
try{
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('[data-nav="conjugation"]').click();
  check(await page.locator('nav [data-view="conjugation"]').getAttribute('aria-current')==='page','conjugation is discoverable from home and navigation');
  check(await page.locator('#conjugation-verb option').count()===6,'six selectable verbs');
  for(const verb of data.conjugation.verbs){
    await page.locator('#conjugation-verb').selectOption(verb.id);
    for(const tense of data.conjugation.tenses){
      await page.locator(`[data-conjugation-tense="${tense.id}"]`).click();
      for(const negative of [false,true]){
        await page.locator(`[data-conjugation-negative="${negative}"]`).click();
        const actual=await page.locator('.conjugation-form[data-conjugation-person]>span').allTextContents();
        const expected=data.conjugation.persons.map(p=>conjugatedForm(verb,tense.id,p.id,negative).arabic);
        check(JSON.stringify(actual)===JSON.stringify(expected),'eight forms render: '+verb.id+'/'+tense.id+'/'+negative);
      }
    }
  }
  await page.locator('#conjugation-verb').selectOption('msha');
  check((await page.locator('[data-conjugation-imperative="nti"]').textContent()).includes('سيري'),'irregular feminine order is explicit');
  await page.locator('[data-conjugation-person="ana"]').click();
  check(await page.locator('.role-negative[data-conjugation-part]').count()===2,'negative morphology has two explicit pieces');
  await page.locator('[data-conjugation-part]').first().click();
  check((await page.locator('#conjugation-guide').textContent()).includes('Négation'),'morphology explains grammatical role');
  await page.keyboard.press('Escape');
  check(await page.locator('[data-conjugation-person="ana"]').evaluate(el=>el===document.activeElement),'detail restores focus');
  await page.locator('[data-conjugation-quiz]').click();
  for(let i=0;i<6;i++){
    const heading=await page.locator('.quiz h2').textContent();
    const person=data.conjugation.persons.find(p=>heading.includes('avec '+p.latin+' ·'));
    const correct=conjugatedForm(data.conjugation.verbs.find(v=>v.id==='msha'),'future',person.id,true).arabic;
    const options=await page.locator('[data-conjugation-answer]').allTextContents();
    check(new Set(options).size===4,'quiz choices are distinct '+i);
    const answer=i===0?options.findIndex(x=>x!==correct):options.indexOf(correct);
    await page.locator(`[data-conjugation-answer="${answer}"]`).click();
    check(await page.locator('[data-conjugation-answer]:disabled').count()===4,'one submission per question '+i);
    if(i===0){
      await page.locator('[data-conjugation-person]').click();
      check(await page.locator('dialog[open]').count()===1,'wrong answer can open correct-form explanation');
      await page.keyboard.press('Escape');
    }
    await page.locator('[data-conjugation-next]').click();
  }
  check((await page.locator('.quiz').textContent()).includes('5 réponses justes sur 6'),'real score reflects wrong answer');
  check(await page.locator('.conjugation-mistakes article').count()===1,'wrong form retained in session recap');
  await page.locator('[data-nav="conjugation"]').click();
  check(await page.locator('[data-conjugation-tense="future"]').getAttribute('aria-pressed')==='true','return preserves selected tense');
  await mkdir(new URL('../test-output/',import.meta.url),{recursive:true});
  await page.screenshot({path:new URL('../test-output/conjugation-desktop.png',import.meta.url).pathname,fullPage:true});
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'conjugation and five-item navigation fit '+width);
    await page.locator('[data-conjugation-person="ntuma"]').click();
    check(await page.locator('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),'future negative detail fits '+width);
    await page.keyboard.press('Escape');
    await page.locator('[data-conjugation-quiz]').click();
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'long future answers fit '+width);
    await page.locator('[data-nav="conjugation"]').click();
  }
  await page.screenshot({path:new URL('../test-output/conjugation-mobile.png',import.meta.url).pathname,fullPage:true});
  check(errors.length===0,'no JavaScript exceptions');
  console.log(`${count} conjugation browser checks passed.`);
}finally{await browser.close();}
