import test from 'node:test';
import assert from 'node:assert/strict';
import {conciseFrench,groupBullets,compactResume} from '../lib/rh-style.mjs';
import {safeRhPassage} from '../lib/rh-passages.mjs';
import {sampleResume} from '../shared/model.mjs';
test('shortens nominalizations without changing participation, negation or facts',()=>{
 assert.equal(conciseFrench('Je suis en charge de la préparation des dossiers clients.'),'Préparer les dossiers clients.');
 assert.equal(conciseFrench('Je fais le suivi des livraisons sous supervision.'),'Suivre les livraisons sous supervision.');
 assert.equal(conciseFrench('Je participe à l’organisation de 3 réunions.'),'Participer à l’organisation de 3 réunions.');
 assert.equal(conciseFrench('Je suis responsable de 4 agents.'),'Je suis responsable de 4 agents.');
 assert.equal(conciseFrench('Je ne gère pas le budget.'),'Je ne gère pas le budget.');
 assert.equal(safeRhPassage('Suivre les dossiers sous supervision.','Suivre les dossiers.'),'Suivre les dossiers sous supervision.');
 assert.equal(safeRhPassage('Suivre les dépenses dans SAP.','Suivre les dépenses.'),'Suivre les dépenses dans SAP.');
 assert.equal(safeRhPassage('Suivre 20 % des dossiers.','Suivre 20 dossiers.'),'Suivre 20 % des dossiers.');
 assert.equal(safeRhPassage('Vérifier les factures.','Vérifier les factures clients.'),'Vérifier les factures.');
});
test('grouping preserves every mission index and only exact common actions or objects',()=>{
 const source=['Préparer les dossiers clients.','Vérifier les dossiers clients.','Suivre les commandes.','Suivre les livraisons.','Participer aux réunions.','Organiser les réunions.'];
 const result=groupBullets(source);
 assert.deepEqual(result.map(g=>g.text),['Préparer et vérifier les dossiers clients.','Suivre les commandes et les livraisons.','Participer aux réunions.','Organiser les réunions.']);
 assert.deepEqual(result.flatMap(g=>g.indices).sort((a,b)=>a-b),[0,1,2,3,4,5]);
 assert.equal(groupBullets(['Suivre les commandes sans validation.','Suivre les livraisons.']).length,2);
});
test('compaction keeps all jobs and metadata, never mixes employers, never mutates input',()=>{
 const source=sampleResume();source.experiences=[{...source.experiences[0],bullets:['Je suis en charge de la préparation des dossiers clients.','Je suis en charge de la vérification des dossiers clients.']},{...source.experiences[1],bullets:['Suivre les commandes.','Suivre les livraisons.']}];
 const snapshot=structuredClone(source);const result=compactResume(source);
 assert.deepEqual(source,snapshot);assert.equal(result.grouped,2);assert.equal(result.shortened,2);
 assert.deepEqual(result.resume.experiences.map(({bullets,...entry})=>entry),source.experiences.map(({bullets,...entry})=>entry));
 for(const field of ['profile','skills','languages','education','email','phone'])assert.deepEqual(result.resume[field],source[field]);
 source.language='en';assert.deepEqual(compactResume(source).resume,source);
});
