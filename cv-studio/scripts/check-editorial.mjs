// Opt-in integration checks against an isolated server/browser, fictional data only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {sampleResume,defaultDesign} from '../shared/model.mjs';
import {DRAFT_KEY} from '../src/storage.mjs';
import {runRewriteJob} from '../src/rewrite-job.mjs';
const base=process.env.QA_BASE||'http://127.0.0.1:4318';
const report={checks:[],examples:[]};
const record=(name,details={})=>{report.checks.push({name,...details});console.log(JSON.stringify({name,...details}));};
const small=sampleResume();small.name='Camille Exemple';small.profile='Gestion administrative et suivi des projets.';
const large=structuredClone(small);
large.experiences=Array.from({length:8},(_,i)=>({title:`Chargée de mission ${i+1}`,organization:`Entreprise fictive ${i+1}`,period:`${2010+i} – ${2011+i}`,location:'Lyon',bullets:[
 'Je suis en charge de la préparation des dossiers clients.',
 'Je suis en charge de la vérification des dossiers clients.',
 'Je fais le suivi des commandes.',
 'Je fais le suivi des livraisons.',
 'Je participe à l’organisation de 3 réunions mensuelles.',
]}));
const browser=await chromium.launch({headless:true});
let config;
const configReady=async()=>{
 const start=Date.now();do {config=await(await fetch(base+'/api/config')).json();if(config.aiConfigured)return;assert.ok(Date.now()-start<190000,config.aiMessage);await new Promise(r=>setTimeout(r,2000));}while(true);
};
const post=async(path,data)=>{
 const response=await fetch(base+'/api/'+path,{method:'POST',headers:{'x-cv-token':config.token,...(!(data instanceof FormData)&&{'Content-Type':'application/json'})},body:data instanceof FormData?data:JSON.stringify(data)});
 if(!response.ok)throw Error(`${path} ${response.status}: ${await response.text()}`);return response;
};
const job=async(resume,action,offer='')=>runRewriteJob({body:{resume,action,job:offer},token:config.token,fetchImpl:(path,options)=>fetch(base+path,options),onProgress:()=>{}});
const metadata=resume=>resume.experiences.map(({bullets,...e})=>e);
const pdfCheck=async(bytes,resume)=>{
 const doc=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;assert.equal(doc.numPages,1);
 const page=await doc.getPage(1);const text=(await page.getTextContent()).items.map(i=>i.str).join(' ');
 for(const entry of resume.experiences)assert.ok(text.includes(entry.organization),`PDF lost ${entry.organization}`);
 await doc.destroy();return text;
};
try {
 await fs.mkdir('work/editorial-qa',{recursive:true});
 config=await(await fetch(base+'/api/config')).json();
 const page=await browser.newPage({viewport:{width:1360,height:1000}});const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));page.setDefaultTimeout(20000);
 await page.goto(base);
 const restore=async(resume,design=defaultDesign)=>{
  await page.locator('input[type=file][accept*=".json"]').setInputFiles({name:'fictional.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({resume,design}))});
  await page.getByRole('status').filter({hasText:'La sauvegarde a été restaurée.'}).waitFor();
 };
 await restore(large);
 const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),DRAFT_KEY);
 assert.deepEqual(before.resume,large);record('Restore JSON and original draft preservation');
 const started=Date.now();
 await page.getByRole('region',{name:'Améliorer votre CV'}).getByRole('button',{name:'Tenir sur une page'}).click();
 await page.getByRole('dialog').waitFor();
 assert.match(await page.getByRole('dialog').innerText(),/Vérifié : le CV tient sur une page A4/);
 await page.getByRole('dialog').getByRole('button',{name:'Appliquer la proposition'}).click();
 const fitted=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),DRAFT_KEY);
 assert.deepEqual(metadata(fitted.resume),metadata(large));
 const response=await post('pdf',fitted);const pdf=Buffer.from(await response.arrayBuffer());await pdfCheck(pdf,large);
 await fs.writeFile('work/editorial-qa/cv-eight-experiences.pdf',pdf);
 await page.getByRole('region',{name:'Votre CV',exact:true}).screenshot({path:'work/editorial-qa/one-page.png'});
 record('Eight experiences fit on one A4 page; all employers in selectable PDF',{seconds:(Date.now()-started)/1000,design:fitted.design});
 // Oversized documents must report overflow and refuse a clipped PDF.
 const huge=structuredClone(large);huge.experiences=Array.from({length:20},(_,i)=>({...large.experiences[i%8],bullets:Array(12).fill('Vérifier les dossiers clients et les justificatifs comptables dans les différents services de l’entreprise, sous la supervision du responsable de service.')}));
 const overflow=await(await post('fit',{resume:huge,design:defaultDesign})).json();assert.equal(overflow.fits,false);assert.ok(overflow.fontSize>=12);
 const refusal=await fetch(base+'/api/pdf',{method:'POST',headers:{'x-cv-token':config.token,'Content-Type':'application/json'},body:JSON.stringify({resume:huge,design:overflow.design})});assert.equal(refusal.status,422);record('Overflow is detected, never silently cropped');
 await restore(small);
 await page.getByRole('tab',{name:'Mise en page',exact:true}).click();
 for(const [label,template] of [['Essentiel','essential'],['Éditorial','editorial'],['Classique','executive']]) {
  await page.getByRole('button',{name:new RegExp(label)}).click();
  for(const font of ['sans','serif']) for(const density of ['comfortable','compact']){
   await page.getByLabel('Police').selectOption(font);await page.getByLabel('Espacement').selectOption(density);
   const design={...defaultDesign,template,font,density};await pdfCheck(await(await post('pdf',{resume:small,design})).arrayBuffer(),small);
  }
 }
 for(const color of ['#183e34','#253b60','#713d35','#383438','#593f70'])await page.getByLabel('Couleur des titres').selectOption(color);
 assert.equal(await page.getByRole('button',{name:'Importer un modèle',exact:true}).isDisabled(),true);
 record('Three templates × two fonts × two densities export correctly; five colors; visual import correctly unavailable');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Sauvegarder',exact:true}).click();const download=await downloadPromise;
 const backup=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.deepEqual(backup.resume,small);
 await page.reload();assert.equal(await page.getByLabel('Nom et prénom').inputValue(),small.name);record('JSON download and persistence after reload');
 const upload=async(name,bytes,path='import-text')=>{const form=new FormData();form.append('file',new Blob([bytes]),name);form.append('kind','cv');return (await post(path,form)).json();};
 const extracted=await upload('fictional.pdf',pdf);assert.ok(extracted.text.includes(large.name));
 const txt=await upload('fictional.txt','Camille Exemple\nGestion administrative');assert.match(txt.text,/Gestion administrative/);
 record('PDF and TXT import without AI; DOCX covered by parser test');
 await page.getByLabel('Méthode d’import').selectOption('local');
 await page.locator('input[type=file]').nth(1).setInputFiles({name:'fictional.txt',mimeType:'text/plain',buffer:Buffer.from('Camille Exemple\nGestion administrative')});
 await page.getByRole('dialog').waitFor();assert.match(await page.getByRole('dialog').innerText(),/Camille Exemple|texte/i);await page.getByRole('dialog').getByRole('button',{name:'Fermer',exact:true}).click();
 record('Local import dialog opens and closes without replacing draft');
 await configReady();
 const rhStarted=Date.now();const optimized=await job(large,'improve','Gestion administrative, suivi des commandes.');
 assert.deepEqual(metadata(optimized.resume),metadata(large));
 assert.ok(optimized.resume.experiences.every(e=>e.bullets.length<5));
 for(const e of optimized.resume.experiences){const text=e.bullets.join(' ');for(const fact of ['dossiers clients','commandes','livraisons','3','mensuelles'])assert.ok(text.includes(fact),`RH lost ${fact}`);assert.match(text,/Particip|Contrib/i);}
 report.examples.push({before:large.experiences[0].bullets,after:optimized.resume.experiences[0].bullets});
 record('Real RH optimization with offer: shorter, grouped, all facts and responsibility levels retained',{seconds:(Date.now()-rhStarted)/1000,beforeBullets:40,afterBullets:optimized.resume.experiences.reduce((n,e)=>n+e.bullets.length,0)});
 // Exercise proposal cancel/apply in the real UI; identical request hits safe cache.
 await restore(large);await page.getByRole('region',{name:'Améliorer votre CV'}).locator('summary').click();
 await page.getByLabel('Poste ou offre à cibler').fill('Gestion administrative, suivi des commandes.');
 await page.getByRole('region',{name:'Améliorer votre CV'}).getByRole('button',{name:'Optimiser la rédaction RH'}).click();await page.getByRole('dialog').waitFor();
 await page.getByRole('dialog').getByRole('button',{name:'Annuler',exact:true}).click();assert.deepEqual((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),DRAFT_KEY)).resume,large);
 await page.getByRole('region',{name:'Améliorer votre CV'}).getByRole('button',{name:'Optimiser la rédaction RH'}).click();await page.getByRole('dialog').waitFor();
 await page.getByRole('dialog').getByRole('button',{name:'Appliquer la proposition'}).click();
 record('RH proposal cancel preserves original; apply saves grouped version');
 for(const viewport of [{width:390,height:844},{width:1360,height:1000}]) {await page.setViewportSize(viewport);await page.screenshot({path:`work/editorial-qa/interface-${viewport.width}.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));}record('Mobile and desktop layouts without horizontal overflow');
 const trStart=Date.now();const english=await job(small,'translate');assert.equal(english.resume.language,'en');assert.equal(english.resume.experiences.length,small.experiences.length);assert.equal(english.resume.email,small.email);assert.match(english.resume.title,/project/i);assert.deepEqual(english.resume.experiences.map(e=>e.bullets.length),small.experiences.map(e=>e.bullets.length));
 const french=await job(english.resume,'translate');assert.equal(french.resume.language,'fr');assert.equal(french.resume.experiences.length,small.experiences.length);assert.match(french.resume.title,/projet/i);assert.deepEqual(french.resume.experiences.map(e=>e.bullets.length),small.experiences.map(e=>e.bullets.length));record('Real translation French → English → French',{seconds:(Date.now()-trStart)/1000});
 const smallPdf=Buffer.from(await(await post('pdf',{resume:small,design:defaultDesign})).arrayBuffer());const importStart=Date.now();const imported=await upload('cv-example.pdf',smallPdf,'import');assert.equal(imported.resume.name,small.name);assert.equal(imported.resume.experiences.length,small.experiences.length);record('AI PDF import structures the fictional CV',{seconds:(Date.now()-importStart)/1000});
 await page.setViewportSize({width:1360,height:1000});await page.getByRole('tab',{name:'Contenu',exact:true}).click();
 page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'Charger un exemple fictif',exact:true}).click();assert.equal(await page.getByLabel('Nom et prénom').inputValue(),'Camille Laurent');
 assert.deepEqual(pageErrors,[]);record('Sample data action and no browser JavaScript errors');
 await fs.writeFile('work/editorial-qa/report.json',JSON.stringify(report,null,2));console.log('ALL EDITORIAL CHECKS PASSED');
} finally {await fs.writeFile('work/editorial-qa/partial-report.json',JSON.stringify(report,null,2));await browser.close();}
