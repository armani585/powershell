import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {conjugatedForm,validateConjugation} from '../learning.mjs';
const data=JSON.parse(await readFile(new URL('../content/learning.json',import.meta.url),'utf8'));
const section=data.conjugation;
const verb=id=>section.verbs.find(v=>v.id===id);
const form=(id,tense,person,negative=false)=>conjugatedForm(verb(id),tense,person,negative);
test('six complete paradigms have 144 affirmative forms and 18 imperatives',()=>{
  assert.deepEqual(validateConjugation(section),[]);assert.equal(section.verbs.length,6);
  assert.equal(section.verbs.reduce((n,v)=>n+Object.values(v.forms).reduce((n,t)=>n+Object.keys(t).length,0),0),144);
  assert.equal(section.verbs.reduce((n,v)=>n+Object.keys(v.imperatives).length,0),18);
});
test('present prefixes and feminine/plural endings are preserved',()=>{
  assert.equal(form('khdem','present','ana').arabic,'كنخدم');
  assert.equal(form('khdem','present','nti').arabic,'كتخدمي');
  assert.equal(form('khdem','present','huma').arabic,'كيخدمو');
  assert.equal(form('khdem','present','nti').latin,'katkhdmi');
});
test('past distinguishes first person from the shared second person form',()=>{
  assert.equal(form('khdem','past','ana').arabic,'خدمت');
  assert.equal(form('khdem','past','nta').arabic,'خدمتي');
  assert.equal(form('khdem','past','nta').arabic,form('khdem','past','nti').arabic);
  assert.notEqual(form('khdem','past','ana').meaning,form('khdem','past','nta').meaning);
});
test('irregular bases are authored rather than inferred from the dictionary form',()=>{
  assert.equal(form('kla','past','ana').arabic,'كليت');
  assert.equal(form('msha','past','ana').arabic,'مشيت');
  assert.equal(form('dar','past','ana').arabic,'درت');
  assert.equal(verb('msha').imperatives.nta.parts.map(p=>p.text).join(''),'سير');
  assert.equal(verb('msha').imperatives.nti.parts.map(p=>p.text).join(''),'سيري');
  assert.equal(verb('msha').imperatives.ntuma.parts.map(p=>p.text).join(''),'سيرو');
});
test('future removes the present marker and negates ghadi rather than the final verb',()=>{
  assert.equal(form('khdem','future','ana').arabic,'غادي نخدم');
  assert.equal(form('khdem','future','ana',true).arabic,'ما غاديش نخدم');
  assert.equal(form('khdem','future','ana',true).latin,'ma ghadi-sh nkhdem');
  for(const v of section.verbs)for(const p of section.persons){
    const present=conjugatedForm(v,'present',p.id),future=conjugatedForm(v,'future',p.id);
    assert.equal(future.parts.slice(2).map(p=>p.text).join(''),present.parts.slice(1).map(p=>p.text).join(''));
  }
});
test('negative form construction preserves stored paradigms and translations',()=>{
  const before=JSON.stringify(section);
  assert.equal(form('shreb','past','ana',true).arabic,'ما شربتش');
  assert.equal(form('shreb','past','ana',true).meaning,'je n’ai pas bu');
  assert.equal(form('msha','past','nti',true).meaning,'tu n’es pas allée');
  assert.equal(form('khdem','present','ana',true).meaning,'je ne travaille pas');
  assert.equal(JSON.stringify(section),before);
});
test('unavailable forms return null and missing forms fail validation',()=>{
  assert.equal(form('khdem','unknown','ana'),null);
  const changed=structuredClone(section);delete changed.verbs[0].forms.future.nti;
  assert.ok(validateConjugation(changed).includes('Invalid conjugation form khdem/future/nti'));
});
test('every quiz context has at least four distinct written choices despite shared forms',()=>{
  for(const v of section.verbs)for(const tense of section.tenses)for(const negative of [false,true]){
    const choices=new Set(section.persons.map(p=>conjugatedForm(v,tense.id,p.id,negative).arabic));
    assert.ok(choices.size>=4,`${v.id}/${tense.id}/${negative}`);
  }
});
test('conjugation never claims native review or verified audio',()=>{
  assert.equal(section.nativeReviewed,false);assert.equal(section.audio,null);
  const changed=structuredClone(section);changed.verbs[0].audio='invented.mp3';
  assert.ok(validateConjugation(changed).includes('Unverified conjugation verb khdem'));
});
