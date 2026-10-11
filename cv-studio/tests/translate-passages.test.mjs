import test from 'node:test';
import assert from 'node:assert/strict';
import {createTranslations} from '../lib/translate-passages.mjs';
import {sampleResume} from '../shared/model.mjs';
test('translation maps every field separately and locks records, mission counts, names and contacts',async()=>{
 const source=sampleResume(),snapshot=structuredClone(source);let calls=0;
 const translate=createTranslations({ask:async(schema,instruction,content,options)=>{calls++;assert.equal(options.textMode,true);const data=JSON.parse(content[0].text);assert.equal(data.targetLanguage,'English');return {text:'Translated '+data.text};}});
 const result=await translate(source);assert.equal(result.resume.language,'en');assert.deepEqual(source,snapshot);
 assert.deepEqual(result.resume.experiences.map(({title,bullets,...metadata})=>metadata),source.experiences.map(({title,bullets,...metadata})=>metadata));
 assert.deepEqual(result.resume.experiences.map(e=>e.bullets.length),source.experiences.map(e=>e.bullets.length));
 const n=calls;await translate(source);assert.equal(calls,n);
});
test('translation errors never return partial output or change numbers or participation',async()=>{
 const source=sampleResume();source.profile='Participer à 3 projets.';
 const translate=createTranslations({ask:async(schema,instruction,content)=>{const data=JSON.parse(content[0].text);return {text:data.kind==='profile'?'Lead 5 projects.':'Project manager'};}});
 await assert.rejects(translate(source),/chiffres/);assert.equal(source.profile,'Participer à 3 projets.');
});
test('English source gets an explicit French instruction and target; copied complete CV is refused',async()=>{
 const source=sampleResume();source.language='en';source.title='Project Manager';
 const translate=createTranslations({ask:async(schema,instruction,content)=>{assert.match(instruction,/Réponds uniquement en français/);const data=JSON.parse(content[0].text);assert.equal(data.targetLanguage,'French');return {text:data.text};}});
 await assert.rejects(translate(source),/recopié/);
});
