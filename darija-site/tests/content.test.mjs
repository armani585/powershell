import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateData,readReviews,STORAGE_KEY,phraseText,baseLetters,escapeHtml,matchesSearch,correctOrder} from '../learning.mjs';
const data=JSON.parse(await readFile(new URL('../content/learning.json',import.meta.url),'utf8'));
const words=new Map(data.words.map(w=>[w.id,w]));
test('all authored written and reading segments reconstruct their words',()=>assert.deepEqual(validateData(data),[]));
test('28 unique letters and six nonjoining letters',()=>{
  assert.equal(data.alphabet.length,28);
  assert.deepEqual(data.alphabet.filter(l=>!l.joinsNext).map(l=>l.letter),['ا','د','ذ','ر','ز','و']);
  for(const l of data.alphabet){assert.ok(l.forms.isolated);assert.ok(l.forms.final);assert.equal(l.forms.initial!==null,l.joinsNext);assert.equal(l.forms.medial!==null,l.joinsNext);}
});
test('all sixty-three scenes contain four distinct questions and answer choices',()=>{
  assert.equal(data.scenes.length,63);
  for(const scene of data.scenes){assert.equal(scene.phrases.length,4);assert.equal(new Set(scene.phrases.map(p=>phraseText(p,words))).size,4);assert.equal(new Set(scene.phrases.map(p=>p.meaning)).size,4);}
});
test('homographs remain separate by meaning',()=>{assert.equal(words.get('water').arabic,words.get('ma-neg').arabic);assert.notEqual(words.get('water').meaning,words.get('ma-neg').meaning);});
test('no fabricated recording or native review status',()=>{assert.equal(data.nativeReviewed,false);assert.equal(data.audioStatus,'missing');for(const w of data.words){assert.equal(w.audio,null);assert.equal(w.nativeReviewed,false);}});
test('missing bookmark storage starts empty',()=>assert.deepEqual(readReviews({getItem:()=>null},new Set()),{ids:[],writable:true,message:''}));
test('invalid JSON is never eligible to overwrite',()=>{const s=readReviews({getItem:()=>'{broken'},new Set());assert.equal(s.writable,false);assert.ok(s.message);});
test('wrong storage shape is protected',()=>{for(const raw of ['{}','null','[1]'])assert.equal(readReviews({getItem:()=>raw},new Set()).writable,false);});
test('unavailable storage preserves session mode',()=>assert.equal(readReviews({getItem:()=>{throw new Error('denied');}},new Set()).writable,false));
test('bookmarks are deduplicated and unknown ids discarded',()=>assert.deepEqual(readReviews({getItem:key=>{assert.equal(key,STORAGE_KEY);return '["bab","bab","unknown"]';}},new Set(words.keys())).ids,['bab']));
test('hamza and combining marks do not obscure base-letter lookup',()=>{assert.deepEqual(baseLetters('أ'),['ا']);assert.deepEqual(baseLetters('شكراً'),['ش','ك','ر','ا']);});
test('markup escaping keeps data as text',()=>assert.equal(escapeHtml('<b>"&\''),'&lt;b&gt;&quot;&amp;&#39;'));
test('validation rejects missing word references',()=>{const d=structuredClone(data);d.scenes[0].phrases[0].words.push('absent');assert.ok(validateData(d).includes('Unknown word absent'));});
test('validation detects lost letters during decomposition',()=>{const d=structuredClone(data);d.words[0].parts.pop();assert.ok(validateData(d).some(e=>e.startsWith('Written segments')));});
test('search ignores French accents and Arabic vocalization',()=>{assert.ok(matchesSearch('hotel',['À l’hôtel']));assert.ok(matchesSearch('شكرا',['شكراً']));assert.ok(matchesSearch('انا',['أنا']));});
test('search matches all terms across fields but not missing terms',()=>{assert.ok(matchesSearch('taxi ici',['Le taxi est ici','t-taksi hna']));assert.equal(matchesSearch('taxi bateau',['Le taxi est ici']),false);});
test('word order respects length, multiplicity and sequence',()=>{assert.ok(correctOrder(['a','a','b'],['a','a','b']));assert.equal(correctOrder(['a','a','b'],['a','b','b']),false);assert.equal(correctOrder(['a','b'],['b','a']),false);assert.equal(correctOrder(['a','b'],['a']),false);});
test('six dialogues reference four local phrases each',()=>{const scenes=data.scenes.filter(s=>s.dialogue);assert.equal(scenes.length,6);for(const s of scenes){assert.equal(s.dialogue.length,4);assert.ok(s.dialogue.every(t=>s.phrases.some(p=>p.id===t.phraseId)));}});
test('invalid cross-scene dialogue reference is rejected',()=>{const d=structuredClone(data);const s=d.scenes.find(s=>s.dialogue);s.dialogue[0].phraseId='rencontres-1';assert.ok(validateData(d).includes('Invalid dialogue '+s.id));});

test('requested topic sets contain useful vocabulary without duplicate membership',()=>{
  assert.equal(data.words.length,581);
  for(const id of ['corps','maison','commerces','nourriture','reperes','animaux','pays','couleurs','mobilier','famille','vetements','objets','metiers','shopping','marche','restaurant','tourisme','transport-voyage','cuisiner','fruits-legumes','bijoux','garage','police-plainte','immobilier-notaire','plage','jours','mois','compter']){
    const topic=data.topics.find(t=>t.id===id);assert.ok(topic);assert.ok(topic.words.length>=10);
    for(const id of topic.words)assert.ok(words.has(id));
  }
});
test('invalid topic reference cannot silently render an empty word',()=>{
  const changed=structuredClone(data);changed.topics[0].words.push('not-a-word');
  assert.ok(validateData(changed).includes('Unknown topic word not-a-word'));
});
test('all six routes arrive at their announced destinations',async()=>{
  const {moveOnMap}=await import('../learning.mjs');
  for(const route of data.neighborhood.routes){
    let position=data.neighborhood.start;
    for(const command of route.steps){position=moveOnMap(position,command,3);assert.ok(position,route.id);}
    const target=data.neighborhood.places.find(p=>p.word===route.destination);
    assert.equal(position.x,target.x);assert.equal(position.y,target.y);
  }
});
test('left and right are relative to heading, including facing south and west',async()=>{
  const {moveOnMap}=await import('../learning.mjs');
  assert.deepEqual(moveOnMap({x:1,y:1,heading:2},'right',3),{x:0,y:1,heading:3});
  assert.deepEqual(moveOnMap({x:1,y:1,heading:2},'left',3),{x:2,y:1,heading:1});
  assert.deepEqual(moveOnMap({x:1,y:1,heading:3},'left',3),{x:1,y:2,heading:2});
  assert.deepEqual(moveOnMap({x:1,y:1,heading:1},'left',3),{x:1,y:0,heading:0});
  assert.equal(moveOnMap({x:0,y:0,heading:0},'forward',3),null);
  assert.equal(moveOnMap({x:1,y:1,heading:0},'invalid',3),null);
});
test('a broken itinerary fails content validation',()=>{
  const changed=structuredClone(data);changed.neighborhood.routes[0].steps=['forward','forward','forward'];
  assert.ok(validateData(changed).includes('Invalid route market'));
});
