import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createSpriteHold} from '../lib/sprite-hold.mjs';
function fakeTransport(calls,failPut=false) {
 return (options,callback)=>{
  const req=new EventEmitter();req.setTimeout=()=>{};req.destroy=e=>req.emit('error',e);
  req.end=body=>{
   calls.push({options,body});queueMicrotask(()=>{
    const res=new EventEmitter();res.statusCode=failPut&&options.method==='PUT'?503:204;res.resume=()=>{};
    callback(res);res.emit('end');
   });
  };return req;
 };
}
test('activity expires even after a crash and is released after successful or failed work',async()=>{
 for(const fails of [false,true]){
  const calls=[];const hold=createSpriteHold({enabled:true,requestImpl:fakeTransport(calls)});
  const work=()=>{assert.equal(calls.length,1);if(fails)throw Error('work failed');return 42;};
  if(fails)await assert.rejects(hold.run(work),/work failed/);else assert.equal(await hold.run(work),42);
  assert.deepEqual(calls.map(c=>c.options.method),['PUT','PUT']);
  assert.equal(JSON.parse(calls[0].body).expire,'7m');
  assert.equal(JSON.parse(calls[1].body).expire,'15s');
  assert.equal(calls[0].options.socketPath,'/.sprite/api.sock');
 }
});
test('concurrent work shares one hold until every caller finishes',async()=>{
 const calls=[];const hold=createSpriteHold({enabled:true,requestImpl:fakeTransport(calls)});let a,b;
 const first=hold.run(()=>new Promise(resolve=>{a=resolve}));
 const second=hold.run(()=>new Promise(resolve=>{b=resolve}));
 await new Promise(resolve=>setImmediate(resolve));assert.equal(calls.length,1);
 a();await first;assert.equal(calls.length,1);b();await second;assert.equal(calls.length,2);
 await hold.run(()=>42);assert.deepEqual(calls.map(c=>JSON.parse(c.body).expire),['7m','15s','7m','15s']);
});
test('hold failures prevent unprotected AI work, and non-Sprite execution needs no socket',async()=>{
 const calls=[];let ran=false;
 const hold=createSpriteHold({enabled:true,requestImpl:fakeTransport(calls,true)});
 await assert.rejects(hold.run(()=>{ran=true}),e=>e.status===503);assert.equal(ran,false);
 const disabled=createSpriteHold({requestImpl:()=>{throw Error('must not connect')}});
 assert.equal(await disabled.run(()=>42),42);
});
