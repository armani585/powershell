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

test('RH generation changes only original prose slots and preserves education and facts',()=>{
 const source=sampleResume();
 const answer={rewrittenProfile:'Coordination de projets numériques.',missions:rhInput(source).missions,notes:[]};
 const result=mergeRewrite(source,expandRh(source,answer),'improve').resume;
 assert.equal(result.profile,answer.rewrittenProfile);assert.deepEqual(result.education,source.education);
 assert.deepEqual(result.experiences,source.experiences);
});
test('RH cannot add or drop a mission description',()=>{
 const source=sampleResume();const answer={rewrittenProfile:source.profile,missions:rhInput(source).missions,notes:[]};
 answer.missions.e99_b0='Mission inventée.';assert.throws(()=>expandRh(source,answer));
 delete answer.missions.e99_b0;delete answer.missions.e0_b0;assert.throws(()=>expandRh(source,answer));
});
