// Real, opt-in inference benchmark. Uses only fictional data and an isolated
// browser context; never reads or changes the user's browser draft.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {sampleResume, defaultDesign} from '../shared/model.mjs';
import {DRAFT_KEY} from '../src/storage.mjs';
const base = 'http://127.0.0.1:4317';
const source=sampleResume();
source.name='Camille Exemple';
source.profile='Je travaille sur la gestion administrative et le suivi des projets.';
const missions=[
 ['Je prépare les dossiers clients.','Je fais le suivi des commandes.','Je classe les documents administratifs.','Je rédige les courriers clients.','Je vérifie les factures fournisseurs.'],
 ['Je prépare le calendrier éditorial.','Je rédige les publications numériques.','Je participe aux événements professionnels.','Je fais le suivi des campagnes.','Je prépare les supports de communication.'],
 ['Je fais le suivi des livrables.','Je prépare les comptes rendus.','Je planifie les réunions techniques.','Je coordonne les échanges entre services.','Je classe les documents de projet.'],
 ['Je prépare les dossiers de candidature.','Je participe aux entretiens de recrutement.','Je planifie les rendez-vous avec les candidats.','Je fais le suivi des absences.','Je prépare les documents de formation.'],
 ['Je prépare les commandes de matériel.','Je fais le suivi des livraisons.','Je vérifie les bons de réception.','Je classe les documents de transport.','Je participe aux inventaires du stock.'],
 ['Je prépare les dossiers de financement.','Je fais le suivi des remboursements.','Je vérifie les justificatifs de dépenses.','Je classe les pièces comptables.','Je participe aux réunions budgétaires.'],
 ['Je rédige les réponses aux demandes clients.','Je fais le suivi des réclamations.','Je prépare les comptes rendus de visite.','Je planifie les rendez-vous commerciaux.','Je classe les contrats clients.'],
 ['Je prépare les documents de réunion.','Je participe aux ateliers de conception.'],
];
source.experiences=missions.map((bullets,i)=>({title:`Chargée de mission ${i+1}`,organization:`Atelier fictif ${i+1}`,period:`${2010+i} – ${2011+i}`,location:'Lyon',bullets}));
const browser=await chromium.launch({headless:true});
try {
 if(!process.argv.includes('--skip-import')) {
  const pdfPage=await browser.newPage();
  await pdfPage.setContent(`<h1>${source.name}</h1><p>${source.email}</p><p>${source.profile}</p>`+source.experiences.map(e=>`<h2>${e.title} — ${e.organization}</h2><p>${e.period}, ${e.location}</p><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul>`).join(''));
  const pdf=await pdfPage.pdf({format:'A4'});await pdfPage.close();
  const config=await (await fetch(base+'/api/config')).json();
  const form=new FormData();form.set('kind','cv');form.set('file',new Blob([pdf],{type:'application/pdf'}),'cv-fictif.pdf');
  const started=Date.now();console.log('Fictional PDF import started');
  const response=await fetch(base+'/api/import',{method:'POST',headers:{'x-cv-token':config.token},body:form,signal:AbortSignal.timeout(310000)});
  const result=await response.json();assert.equal(response.status,200,result.error);
  assert.equal(result.resume.name,source.name);
  assert.deepEqual(result.resume.experiences.map(e=>e.organization),source.experiences.map(e=>e.organization));
  console.log(JSON.stringify({pdfImportSeconds:(Date.now()-started)/1000,importedExperiences:result.resume.experiences.length}));
 }
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 page.setDefaultTimeout(180000);
 await page.addInitScript(({key,resume,design})=>localStorage.setItem(key,JSON.stringify({resume,design})),{key:DRAFT_KEY,resume:source,design:defaultDesign});
 let firstProgress=null,last=-1,start;const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',async response=>{
  if(!response.url().includes('/api/rewrite-jobs/')||response.status()!==200)return;
  try {
   const data=await response.json();
   if(data.status==='failed'){console.error('RH failed:',data.error);await page.close();return;}
   if(data.progress&&data.progress.completed!==last){
    last=data.progress.completed;assert.equal(data.progress.total,38);
    const seconds=(Date.now()-start)/1000;
    if(last>0&&firstProgress===null)firstProgress=seconds;
    console.log(JSON.stringify({completed:last,total:38,seconds}));
   }
  }catch(error){errors.push(error.message)}
 });
 await page.goto(base);start=Date.now();
 await page.getByRole('region',{name:'Améliorer votre CV'}).getByRole('button',{name:'Optimiser la rédaction RH'}).click();
 await page.getByRole('dialog').waitFor();
 const seconds=(Date.now()-start)/1000;
 await page.getByRole('dialog').getByRole('button',{name:'Appliquer la proposition'}).click();
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),DRAFT_KEY);
 assert.deepEqual(saved.resume.experiences.map(e=>[e.title,e.organization,e.period,e.location,e.bullets.length]),source.experiences.map(e=>[e.title,e.organization,e.period,e.location,e.bullets.length]));
 let changed=0;
 source.experiences.forEach((e,i)=>e.bullets.forEach((b,j)=>{
  const updated=saved.resume.experiences[i].bullets[j];
  if(b!==updated)changed++;
  if(/partici/i.test(b))assert.match(updated,/partici|contrib/i);
 }));
 assert.ok(firstProgress!==null);assert.deepEqual(errors,[]);
 assert.ok(changed>0,'No RH reformulation was accepted');
 console.log(JSON.stringify({rhSeconds:seconds,firstProgressSeconds:firstProgress,passages:38,changedMissions:changed,allExperiencesPreserved:true}));
}finally{await browser.close()}
