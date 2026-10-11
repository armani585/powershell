// Visual and PDF regression checks on fictional data in an isolated browser.
import {chromium} from 'playwright';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {sampleResume,defaultDesign} from '../shared/model.mjs';
import {compactResume} from '../lib/rh-style.mjs';
const base=process.env.QA_BASE||'http://127.0.0.1:4318';
const browser=await chromium.launch();
const folder='work/layout-review';await fs.mkdir(folder,{recursive:true});
try {
 const page=await browser.newPage({viewport:{width:1360,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);
 const config=await(await fetch(base+'/api/config')).json();
 const post=async(path,body)=>{const response=await fetch(base+'/api/'+path,{method:'POST',headers:{'x-cv-token':config.token,'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(response.status,200,await response.clone().text());return response;};
 const restore=async(resume,design=defaultDesign)=>{
  await page.locator('input[type=file]').first().setInputFiles({name:'fictional.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({resume,design}))});
  await page.getByRole('status').filter({hasText:'La sauvegarde a été restaurée.'}).waitFor();
 };
 const sample=sampleResume();await restore(sample);await page.getByRole('tab',{name:'Mise en page',exact:true}).click();
 const templates=[['Essentiel','essential'],['Moderne','editorial'],['Classique','executive']];
 for(const [label,template] of templates){
  await page.getByRole('button',{name:new RegExp(label)}).click();
  assert.equal(await page.getByLabel('Police').inputValue(),template==='executive'?'serif':'sans');
  await page.locator('#resume').screenshot({path:`${folder}/after-${template}.png`});
  const geometry=await page.locator('#resume').evaluate(el=>{const header=el.querySelector('.cv-heading'),main=el.querySelector('.cv-main'),aside=el.querySelector('.cv-aside');return {contactInHeader:!!header.querySelector('.cv-contact'),detailsBelow:aside.getBoundingClientRect().top>=main.getBoundingClientRect().bottom-1,sidebarBorder:getComputedStyle(aside).borderLeftWidth,clipped:el.scrollWidth>el.clientWidth+1};});
  assert.equal(geometry.contactInHeader,true);assert.equal(geometry.detailsBelow,true);assert.equal(geometry.sidebarBorder,'0px');assert.equal(geometry.clipped,false);
  for(const font of ['sans','serif'])for(const density of ['comfortable','compact']){
   const response=await post('pdf',{resume:sample,design:{...defaultDesign,template,font,density}});
   const doc=await getDocument({data:new Uint8Array(await response.arrayBuffer())}).promise;assert.equal(doc.numPages,1);
   const text=(await(await doc.getPage(1)).getTextContent()).items.map(i=>i.str).join(' ');
   for(const value of [sample.name,sample.email,...sample.skills,...sample.experiences.map(e=>e.organization)])assert.ok(text.includes(value),value);
   await doc.destroy();
  }
  console.log(JSON.stringify({template,geometry,pdfVariants:4}));
 }
 await page.locator('.template-options').screenshot({path:`${folder}/after-chooser.png`});
 const large=structuredClone(sample);large.experiences=Array.from({length:8},(_,i)=>({...sample.experiences[0],organization:'Entreprise fictive '+(i+1),period:`${2010+i} – ${2011+i}`,bullets:['Je suis en charge de la préparation des dossiers clients.','Je suis en charge de la vérification des dossiers clients.','Je fais le suivi des commandes.','Je fais le suivi des livraisons.','Je participe à l’organisation de 3 réunions mensuelles.']}));
 const resume=compactResume(large).resume;
 for(const [label,template] of templates){const fit=await(await post('fit',{resume,design:{...defaultDesign,template,density:'compact',font:template==='executive'?'serif':'sans'}})).json();assert.equal(fit.fits,true,label+' overflow');assert.equal(fit.design.template,template,label+' should retain selected layout');assert.ok(fit.fontSize>=12);console.log(JSON.stringify({longCV:label,fit}));}
 await restore(large);await page.getByRole('region',{name:'Améliorer votre CV'}).getByRole('button',{name:'Tenir sur une page'}).click();await page.getByRole('dialog').waitFor();assert.match(await page.getByRole('dialog').innerText(),/Vérifié : le CV tient sur une page A4/);await page.getByRole('dialog').getByRole('button',{name:'Appliquer la proposition'}).click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('cv-studio-draft-v1')));assert.equal(saved.resume.experiences.length,8);await page.locator('#resume').screenshot({path:`${folder}/after-eight-experiences.png`});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${folder}/after-mobile.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
 assert.deepEqual(errors,[]);
 const gallery=await browser.newPage({viewport:{width:1080,height:600},deviceScaleFactor:1});
 const cards=await Promise.all(templates.map(async([label,key])=>`<section><h2>${label}</h2><img src="data:image/png;base64,${(await fs.readFile(`${folder}/after-${key}.png`)).toString('base64')}"/></section>`));
 await gallery.setContent(`<html><head><style>body{margin:0;padding:20px;background:#edf0ed;font:14px Arial;color:#173e34}main{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}h1{font-size:18px;margin:0 0 14px}h2{font-size:15px;margin:0 0 10px}img{display:block;width:100%;box-shadow:0 2px 10px #0001}section{min-width:0}</style></head><body><h1>CV Studio · Les trois mises en page — exemple fictif</h1><main>${cards.join('')}</main></body></html>`);
 await gallery.screenshot({path:`${folder}/comparison.png`,fullPage:true});
 console.log('PASS: no sidebar bands; header contacts; all three templates, fonts, densities, PDF text, eight experiences, mobile preview');
}finally{await browser.close()}
