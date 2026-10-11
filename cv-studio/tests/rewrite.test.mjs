import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleResume } from '../shared/model.mjs';
import { rewriteInput, mergeRewrite, expandRh, rhInput } from '../lib/rewrite.mjs';
const fixture = () => { const source=sampleResume(); return {source, result:{...structuredClone(rewriteInput(source)),notes:[]}}; };
test('rewriting cannot remove, add, duplicate or reorder experience/education entries',()=>{
 for(const key of ['experiences','education']) for(const kind of ['remove','add','id']) {
 const {source,result}=fixture();
 if(kind==='remove') result[key].pop();
 if(kind==='add') result[key].push({...result[key][0]});
 if(kind==='id') result[key][0].id=42;
 assert.throws(()=>mergeRewrite(source,result,'condense'),/refusée/);
 }
});
test('RH optimization locks original identities, job titles, companies, dates and skills',()=>{
 const {source,result}=fixture();result.title='Directrice';result.name='Autre personne';result.skills=['Compétence inventée'];
 result.experiences[0].organization='Autre société';result.experiences[0].period='2030';result.experiences[0].title='Directrice';
 const merged=mergeRewrite(source,result,'improve').resume;assert.deepEqual(merged,source);
});
test('new numerical claims are rejected, provided claims remain allowed',()=>{
 const {source,result}=fixture();result.experiences[0].bullets=['Gérer une équipe de 99 personnes.'];
 assert.throws(()=>mergeRewrite(source,result,'improve'),/chiffres absents/);
});
test('translation changes prose but retains entry count, facts and contact details',()=>{
 const {source,result}=fixture();result.title='Digital project manager';result.experiences[0].title='Project manager';result.skills=['Project management','Communication','Workshop facilitation'];
 const merged=mergeRewrite(source,result,'translate').resume;
 assert.equal(merged.language,'en');assert.equal(merged.title,result.title);assert.equal(merged.email,source.email);
 assert.equal(merged.experiences[0].period,source.experiences[0].period);assert.equal(merged.experiences[0].organization,source.experiences[0].organization);
 result.languages.pop();assert.throws(()=>mergeRewrite(source,result,'translate'),/nombre/);
});
test('a copied French CV cannot be labelled as an English translation',()=>{
 const {source,result}=fixture();
 assert.throws(()=>mergeRewrite(source,result,'translate'),/sans le traduire/);
});

test('RH edits preserve all untouched fields and every original position',()=>{
 const source=sampleResume();const missions=rhInput(source).missions;
 const answer={profile:'Coordination de projets numériques.',edits:[{id:missions[0].id,text:'Coordonner les équipes.'}]};
 const result=mergeRewrite(source,expandRh(source,answer),'improve').resume;
 assert.equal(result.profile,answer.profile);assert.deepEqual(result.education,source.education);
 assert.equal(result.experiences[0].bullets[0],answer.edits[0].text);
 assert.equal(result.experiences[0].bullets[1],source.experiences[0].bullets[1]);
 assert.equal(result.experiences.length,source.experiences.length);
});
test('empty edit list conserves the entire CV rather than deleting missions',()=>{
 const source=sampleResume();assert.deepEqual(mergeRewrite(source,expandRh(source,{profile:null,edits:[]}),'improve').resume,source);
});
test('RH refuses unknown, duplicate or empty edits',()=>{
 const source=sampleResume();const id=rhInput(source).missions[0].id;
 for(const edits of [[{id:'unknown',text:'Inventé'}],[{id,text:'Mission'},{id,text:'Mission'}],[{id,text:'  '}]])assert.throws(()=>expandRh(source,{profile:null,edits}));
});
test('RH maps edits by id without changing experience or bullet order',()=>{
 const source=sampleResume();const missions=rhInput(source).missions;
 const edits=missions.map(m=>({id:m.id,text:m.text+' ' })).reverse();
 const result=expandRh(source,{profile:null,edits});
 assert.deepEqual(result.experiences.map(e=>e.bullets),source.experiences.map(e=>e.bullets.map(b=>b+' ')));
});
test('RH preserves figures in each mission, not just somewhere in the CV',()=>{
 const source=sampleResume();source.experiences[0].bullets=['Coordonner 5 personnes.','Suivre 12 projets.'];
 const id=rhInput(source).missions[0].id;
 for(const text of ['Coordonner 12 personnes.','Coordonner les personnes.'])assert.throws(()=>expandRh(source,{profile:null,edits:[{id,text}]}));
});
test('deduplication retains repeated experience records and every repeated mission',()=>{
 const source=sampleResume();source.experiences=Array.from({length:20},(_,i)=>({...source.experiences[0],organization:'Entreprise '+i,bullets:Array(12).fill('Je fais le suivi des livrables.')}));
 assert.equal(rhInput(source).missions.length,1);
 const result=expandRh(source,{profile:null,edits:[{id:'m0',text:'Suivre les livrables.'}]});
 assert.equal(result.experiences.length,20);assert.equal(result.experiences.flatMap(e=>e.bullets).length,240);
 assert.deepEqual(result.experiences.map(e=>e.organization),source.experiences.map(e=>e.organization));
 assert.ok(result.experiences.every(e=>e.bullets.every(b=>b==='Suivre les livrables.')));
});
