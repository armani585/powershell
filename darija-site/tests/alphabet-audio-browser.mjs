import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));let checks=0;function check(v,m){assert.ok(v,m);checks++;}
try{
 await p.addInitScript(()=>{
  window.fakeVoices=[];window.spoken=[];window.cancelled=0;window.failSpeech=false;
  const synth=new EventTarget();synth.getVoices=()=>window.fakeVoices;synth.cancel=()=>{window.cancelled++;};synth.speak=u=>{if(window.failSpeech)throw new Error('speech failed');window.spoken.push({text:u.text,lang:u.lang,rate:u.rate});u.onend?.();};
  Object.defineProperty(window,'speechSynthesis',{value:synth,configurable:true});Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text;}},configurable:true});
 });
 await p.goto(process.env.BASE_URL||'http://127.0.0.1:4174/',{waitUntil:'networkidle'});await p.locator('nav [data-view="alphabet"]').click();await p.locator('[data-letter="letter-2"]').click();
 check(await p.locator('[data-speak-letter]').isDisabled(),'no voice disables listening');check((await p.locator('#letter-listening').textContent()).includes('Aucune voix arabe'),'no voice explained');
 await p.evaluate(()=>{window.fakeVoices=[{name:'French',lang:'fr-FR'}];speechSynthesis.dispatchEvent(new Event('voiceschanged'));});check(await p.locator('[data-speak-letter]').isDisabled(),'non Arabic voice not used');
 await p.evaluate(()=>{window.fakeVoices.push({name:'Arabic test',lang:'ar-SA'});speechSynthesis.dispatchEvent(new Event('voiceschanged'));});check(await p.locator('[data-speak-letter]').isEnabled(),'late Arabic voice activates listening');check((await p.locator('#letter-listening').textContent()).includes('Voix de synthèse'),'synthetic status visible');
 await p.locator('[data-speak-letter]').click();check(await p.evaluate(()=>window.spoken[0].text==='بَاء'&&window.spoken[0].lang==='ar-SA'),'speaks name not consonant or word');check((await p.locator('#letter-audio-status').textContent()).includes('terminée'),'playback completion reported');
 await p.evaluate(()=>window.failSpeech=true);await p.locator('[data-speak-letter]').click();check((await p.locator('#letter-audio-status').textContent()).includes('indisponible'),'speech failure handled');const old=await p.evaluate(()=>window.cancelled);await p.keyboard.press('Escape');await p.waitForFunction(old=>window.cancelled>old,old);check(await p.evaluate(()=>window.cancelled)>old,'closing cancels audio');await p.locator('.object-card[data-word="bab"]').click();check(await p.locator('[data-speak-letter]').count()===0,'word never gains audio button');check(errors.length===0,'no exceptions');console.log(checks+' mocked alphabet audio checks passed (not a recording validation)');
}finally{await b.close();}
