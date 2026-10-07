import test from 'node:test';
import assert from 'node:assert/strict';
import { runRewriteJob } from '../src/rewrite-job.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
test('lost acknowledgement and temporary gateway failure recover without submitting a second logical job',async()=>{
 let clock=0;let n=0;const posted=[];const progress=[];
 const result=await runRewriteJob({body:{action:'improve'},token:'test',requestId:'test_request_12345',now:()=>clock,pause:async ms=>{clock+=ms},onProgress:m=>progress.push(m),fetchImpl:async(url,options)=>{
 n++;assert.equal(options.headers['x-cv-token'],'test');
 if(options.method==='POST'){posted.push(JSON.parse(options.body));if(posted.length===1)throw Error('lost ack');return json({id:'job',status:'running'},202);}
 if(n===3)return new Response('gateway timeout',{status:504});
 return json({id:'job',status:'done',result:{resume:'fictif'}});
 }});
 assert.deepEqual(result,{resume:'fictif'});assert.equal(posted.length,2);assert.deepEqual(posted[0],posted[1]);assert.ok(progress.some(p=>p.includes('Reprise automatique')));
});
test('model validation errors are shown without retrying or overwriting the CV',async()=>{
 let calls=0;
 await assert.rejects(runRewriteJob({body:{},token:'x',requestId:'test_request_12345',fetchImpl:async()=>{calls++;return json({id:'j',status:'failed',error:'Expérience supprimée : proposition refusée.'})}}),/proposition refusée/);assert.equal(calls,1);
});
test('expired authentication and restart errors are distinguishable from a slow calculation',async()=>{
 await assert.rejects(runRewriteJob({body:{},token:'x',requestId:'test_request_12345',fetchImpl:async()=>new Response('<html>login</html>',{headers:{'content-type':'text/html'}})}),/connexion privée/);
 await assert.rejects(runRewriteJob({body:{},token:'x',requestId:'test_request_12345',fetchImpl:async()=>json({error:'Serveur redémarré'},404)}),/redémarré/);
});
