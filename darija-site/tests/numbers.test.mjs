import test from 'node:test';import assert from 'node:assert/strict';import {numberWords} from '../learning.mjs';import {readFile} from 'node:fs/promises';
const d=JSON.parse(await readFile(new URL('../content/learning.json',import.meta.url),'utf8'));const ids=new Set(d.words.map(w=>w.id));
test('all 1000 counting forms resolve to existing words',()=>{for(let i=0;i<1000;i++){const ws=numberWords(i);assert.ok(ws.every(id=>ids.has(id)));assert.ok(ws.length>=1&&ws.length<=5);}});
test('compound numbers put unit before conjunction and tens, with contextual two',()=>{assert.deepEqual(numberWords(23),['num-3','w-and','num-20']);assert.deepEqual(numberWords(92),['num-two-compound','w-and','num-90']);assert.deepEqual(numberWords(2),['jooj']);assert.deepEqual(numberWords(0),['num-0']);});
test('blank, fractional and out-of-range numeric inputs cannot create nonexistent words',()=>{for(const n of [-1,1000,2.5,NaN,Infinity])assert.equal(numberWords(n),null);});
test('seven days and twelve Gregorian months retain correct order',()=>{assert.deepEqual(d.topics.find(t=>t.id==='jours').words.slice(0,7),['day-mon','day-tue','day-wed','day-thu','day-fri','day-sat','day-sun']);assert.deepEqual(d.topics.find(t=>t.id==='mois').words.slice(0,12),Array.from({length:12},(_,i)=>'month-'+(i+1)));});

test("hundreds precede the correctly ordered remainder",()=>{assert.deepEqual(numberWords(123),["num-100","w-and","num-3","w-and","num-20"]);assert.deepEqual(numberWords(202),["num-200","w-and","jooj"]);assert.deepEqual(numberWords(900),["num-900"]);});
