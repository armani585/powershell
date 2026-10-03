import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateData,phraseText,readReviews} from '../learning.mjs';
const data=JSON.parse(await readFile(new URL('../content/learning.json',import.meta.url),'utf8'));
const words=new Map(data.words.map(w=>[w.id,w]));
const phrase=id=>data.scenes.flatMap(s=>s.phrases).find(p=>p.id===id);

test('a missing, self-referencing or chained base cannot reach the word dialog',()=>{
  for(const formOf of ['missing','def-kouzina','def-serwal']){
    const changed=structuredClone(data);changed.words.find(w=>w.id==='def-kouzina').formOf=formOf;
    assert.ok(validateData(changed).includes('Invalid contextual form def-kouzina'));
  }
});
test('validation detects an article lost despite otherwise consistent segmentation',()=>{
  const changed=structuredClone(data);const form=changed.words.find(w=>w.id==='def-kouzina');
  form.parts.shift();form.arabic=form.parts.map(p=>p.text).join('');form.latin=form.parts.map(p=>p.sound).join('');
  assert.ok(validateData(changed).includes('Invalid definite form def-kouzina'));
});
test('contextual forms preserve old bookmarks and can be saved independently',()=>{
  const saved=readReviews({getItem:()=>JSON.stringify(['kouzina','def-kouzina','mahata','stop'])},new Set(words.keys()));
  assert.deepEqual(saved.ids,['kouzina','def-kouzina','mahata','stop']);assert.equal(saved.writable,true);
});
test('article and demonstrative contrasts remain distinct in actual scene phrases',()=>{
  assert.equal(phraseText(phrase('maison-1'),words),'فين الكوزينة');
  assert.equal(phraseText(phrase('mall-fitting-4'),words),'بغيت هاد القميجة');
  assert.equal(phraseText(phrase('vetements-4'),words),'هادي قميجة بيضا');
  assert.equal(words.get('def-serwal').latin,'s-serwal');
  assert.equal(words.get('def-kouzina').latin,'l-kouzina');
});
test('quantity examples use plural nouns for two/three and singular after twenty',()=>{
  assert.equal(phraseText(phrase('compter-1'),words),'بغيت جوج وراق');
  assert.equal(phraseText(phrase('compter-2'),words),'بغيت تلاتة كيسان');
  assert.equal(phraseText(phrase('compter-3'),words),'عشرة دراهم');
  assert.equal(phraseText(phrase('compter-4'),words),'عشرين درهم');
});
