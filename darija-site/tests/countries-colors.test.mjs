import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateData} from '../learning.mjs';
const data=JSON.parse(await readFile(new URL('../content/learning.json',import.meta.url),'utf8'));
const words=new Map(data.words.map(w=>[w.id,w]));
test('twenty countries have unique local SVG flags with matching identities',async()=>{
  const countries=data.topics.find(t=>t.id==='pays').words.map(id=>words.get(id));
  assert.equal(countries.length,20);assert.equal(new Set(countries.map(w=>w.countryCode)).size,20);
  for(const w of countries){
    const svg=await readFile(new URL('../illustrations/flags/'+w.countryCode+'.svg',import.meta.url),'utf8');
    assert.ok(svg.includes('flag-icons-'+w.countryCode));assert.ok(svg.includes('viewBox="0 0 640 480"'));
    assert.equal(/<(?:script|foreignObject|image)\b/i.test(svg),false);
  }
});
test('twelve distinct basic colours and six feminine pairs stay consistent',()=>{
  const topic=data.topics.find(t=>t.id==='couleurs');assert.equal(topic.words.length,18);assert.equal(topic.colorQuiz.length,12);assert.equal(topic.colorPairs.length,6);
  assert.equal(new Set(topic.colorQuiz.map(id=>words.get(id).arabic)).size,12);
  for(const pair of topic.colorPairs){assert.equal(words.get(pair.masculine).colorHex,words.get(pair.feminine).colorHex);assert.notEqual(words.get(pair.masculine).arabic,words.get(pair.feminine).arabic);}
  assert.equal(words.get('7emra').latin,'7emra');
});
test('white and eggs remain separate entries despite their shared spelling',()=>{
  assert.equal(words.get('byed-color').arabic,words.get('bid').arabic);
  assert.notEqual(words.get('byed-color').meaning,words.get('bid').meaning);
  assert.notEqual(words.get('byed-color').latin,words.get('bid').latin);
});
test('invalid swatches, flags and agreement references are rejected',()=>{
  const changed=structuredClone(data);changed.words.find(w=>w.id==='7mer').colorHex='red;url(bad)';
  changed.words.find(w=>w.id==='country-ma').countryCode='../bad';
  changed.topics.find(t=>t.id==='couleurs').colorPairs[0].feminine='unknown';
  const errors=validateData(changed);assert.ok(errors.includes('Invalid color swatch 7mer'));assert.ok(errors.includes('Invalid country flag country-ma'));assert.ok(errors.includes('Invalid color pair couleurs'));
});
