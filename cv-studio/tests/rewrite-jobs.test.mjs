import test from 'node:test';
import assert from 'node:assert/strict';
import { createRewriteJobs } from '../lib/rewrite-jobs.mjs';
const tick = () => new Promise(resolve => setImmediate(resolve));
const id='0123456789abcdef';
test('job creation replies while work is pending and retrying the same request runs it once', async()=>{
 let resolve;let calls=0;const jobs=createRewriteJobs({execute:()=>{calls++;return new Promise(r=>resolve=r)}});
 try {
 const first=jobs.start(id,{cv:'fictif'});assert.equal(first.status,'running');
 assert.equal(jobs.start(id,{cv:'fictif'}).id,first.id);
 await tick();assert.equal(calls,1);assert.deepEqual(jobs.get(first.id),first);
 assert.throws(()=>jobs.start(id,{cv:'autre'}),{status:409});
 assert.throws(()=>jobs.start('another_request_id',{}),{status:429});
 resolve({resume:'fictif'});await tick();assert.equal(jobs.get(first.id).status,'done');
 assert.deepEqual(jobs.get(first.id).result,{resume:'fictif'});
 assert.equal(jobs.start(id,{cv:'fictif'}).id,first.id);assert.equal(calls,1);
 } finally{jobs.close()}
});
test('failed jobs return handled errors without exposing internal exception details',async()=>{
 const jobs=createRewriteJobs({execute:async()=>{throw Error('internal secret')}});
 try {const job=jobs.start(id,{});await tick();const result=jobs.get(job.id);assert.equal(result.status,'failed');assert.ok(!result.error.includes('secret'));}finally{jobs.close()}
});
test('results expire, stored data is bounded, and active jobs are not expired',async()=>{
 let clock=0;let finish;const jobs=createRewriteJobs({execute:()=>new Promise(r=>finish=r),now:()=>clock,retentionMs:100,maxJobs:1});
 try {const one=jobs.start(id,{});await tick();clock=200;assert.equal(jobs.get(one.id).status,'running');finish({});await tick();clock=301;assert.throws(()=>jobs.get(one.id),{status:404});
 const two=jobs.start('another_request_id',{});await tick();finish({});await tick();jobs.start('third_request_id',{changed:true});assert.throws(()=>jobs.get(two.id),{status:404});
 }finally{jobs.close()}
});

test('identical successful CV/actions reuse results; changed input and failed results do not',async()=>{
 let calls=0;const jobs=createRewriteJobs({execute:async(input)=>{calls++;if(input.fail)throw Error('failed');return input;}});
 try {
 const first=jobs.start('first_request_1234',{cv:'one',action:'improve'});await tick();
 const second=jobs.start('second_request_1234',{cv:'one',action:'improve'});assert.equal(second.id,first.id);assert.equal(second.cached,true);assert.equal(calls,1);
 const changed=jobs.start('third_request_1234',{cv:'two',action:'improve'});await tick();assert.notEqual(changed.id,first.id);assert.equal(calls,2);
 const failed=jobs.start('fourth_request_1234',{fail:true});await tick();
 const retry=jobs.start('fifth_request_1234',{fail:true});await tick();assert.notEqual(failed.id,retry.id);assert.equal(calls,4);
 }finally{jobs.close()}
});
