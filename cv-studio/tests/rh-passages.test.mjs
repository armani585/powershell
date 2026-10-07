import test from 'node:test';
import assert from 'node:assert/strict';
import {createRhPassages,safeRhPassage} from '../lib/rh-passages.mjs';
import {sampleResume} from '../shared/model.mjs';
test('per-passage guards retain participation, figures and responsibility level',()=>{
 for(const [source,result] of [
 ['Je participe à l’organisation des événements.','Organiser les événements.'],
 ['Organiser les réunions.','Organiser et animer les réunions.'],
 ['Suivre 5 projets.','Suivre 12 projets.'],
 ['Suivre les livrables.','Superviser une équipe.'],
 ['Suivre les livrables.',''],
 ['Planifier les projets.','Participer à la planification des projets.'],
 ['Gestion administrative et relation client.','Gérer les projets numériques.'],
 ])assert.equal(safeRhPassage(source,result),source);
 assert.equal(safeRhPassage('Je participe aux événements.','Contribuer aux événements.'),'Contribuer aux événements.');
 assert.equal(safeRhPassage('Je fais le suivi des livrables.','Suivre le suivi des livrables.'),'Assurer le suivi des livrables.');
});
test('changed passages alone recompute; contact changes reuse safe cached text',async()=>{
 let calls=0;const progress=[];
 const runner=createRhPassages({ask:async(schema,instructions,content,options)=>{
 calls++;assert.equal(options.jsonMode,true);const data=JSON.parse(content[0].text);return {text:data.source.replace('Je fais','Assurer')};}});
 try{
 const resume=sampleResume();resume.profile='';resume.experiences=[{...resume.experiences[0],bullets:['Je fais le suivi.','Je fais les réunions.']}];
 await runner.optimize({resume,job:''},p=>progress.push(p));assert.equal(calls,2);assert.deepEqual(progress.at(-1),{completed:2,total:2});
 resume.email='different@example.com';let r=await runner.optimize({resume,job:''});assert.equal(calls,2);assert.equal(r.reused,2);
 resume.experiences[0].bullets[1]='Je fais les comptes rendus.';r=await runner.optimize({resume,job:''});assert.equal(calls,3);assert.equal(r.reused,1);
 await runner.optimize({resume,job:'Autre poste'});assert.equal(calls,5);
 }finally{runner.close()}
});
test('short-lived passage cache expires and generation failure never supplies a partial result',async()=>{
 let clock=0,calls=0,fail=false;
 const runner=createRhPassages({now:()=>clock,ttlMs:10,ask:async()=>{calls++;if(fail)throw Error('unavailable');return {text:'Suivre les livrables.'}}});
 try{const resume=sampleResume();resume.profile='';resume.experiences=[{...resume.experiences[0],bullets:['Je fais le suivi des livrables.']}];
 await runner.optimize({resume,job:''});clock=20;await runner.optimize({resume,job:''});assert.equal(calls,2);
 clock=40;fail=true;await assert.rejects(runner.optimize({resume,job:''}),/unavailable/);
 }finally{runner.close()}
});

test('all passages share one overall deadline and no partial CV is returned',async()=>{
 let clock=0,calls=0;const runner=createRhPassages({now:()=>clock,deadlineMs:100,ask:async(schema,instructions,content,options)=>{calls++;assert.equal(options.requestTimeoutMs,100);clock=101;return {text:JSON.parse(content[0].text).source};}});
 try {const resume=sampleResume();await assert.rejects(runner.optimize({resume,job:''}),error=>error.status===504);assert.equal(calls,1);}finally{runner.close()}
});
