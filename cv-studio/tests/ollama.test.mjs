import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { createOllama } from "../lib/ollama.mjs";
const schema = z.object({ name: z.string() });
const input = [{ type: "input_text", text: "Nom : Camille" }];
const answer = (content = '{"name":"Camille"}') => ({
  ok: true,
  status: 200,
  json: async () => ({ done: true, done_reason: "stop", message: { content } }),
});
test("Ollama uses the local chat endpoint and structured output, with no API credential", async () => {
  let request;
  const client = createOllama({
    fetchImpl: async (url, options) => {
      request = { url, options };
      return answer();
    },
  });
  assert.deepEqual(await client.ask(schema, "Ne rien inventer.", input), {
    name: "Camille",
  });
  assert.equal(request.url, "http://127.0.0.1:11434/api/chat");
  assert.equal(request.options.headers.Authorization, undefined);
  const payload = JSON.parse(request.options.body);
  assert.equal(payload.stream, false);
  assert.equal(payload.model, "qwen2.5:3b");
  assert.equal(payload.format.type, "object");
  assert.equal(payload.options.temperature, 0);
  assert.match(payload.messages[0].content, /Ne rien inventer/);
});
test("readiness distinguishes missing service and missing model", async () => {
  const unavailable = createOllama({
    fetchImpl: async () => {
      throw Error();
    },
  });
  assert.equal((await unavailable.status()).ready, false);
  const missing = createOllama({
    fetchImpl: async () => ({ ok: true, json: async () => ({ models: [] }) }),
  });
  assert.match((await missing.status()).message, /pas encore installé/);
  const ready = createOllama({
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ models: [{ name: "qwen2.5:3b" }] }),
    }),
  });
  assert.equal((await ready.status()).ready, true);
});
test("invalid, truncated and unavailable-model responses never replace the resume", async () => {
  for (const response of [
    answer("not json"),
    answer('{"name":42}'),
    {
      ok: true,
      status: 200,
      json: async () => ({ done: true, done_reason: "length" }),
    },
    { ok: false, status: 404 },
  ]) {
    const client = createOllama({ fetchImpl: async () => response });
    await assert.rejects(client.ask(schema, "", input), (error) =>
      [502, 503].includes(error.status),
    );
  }
});
test("limits and local-only endpoint validation reject unsupported input before a request", async () => {
  let calls = 0;
  const client = createOllama({
    fetchImpl: async () => {
      calls++;
      return answer();
    },
  });
  await assert.rejects(
    client.ask(schema, "", [{ type: "input_image" }]),
    (error) => error.status === 400,
  );
  await assert.rejects(
    client.ask(schema, "", [{ type: "input_text", text: "x".repeat(23000) }]),
    (error) => error.status === 413,
  );
  assert.equal(calls, 0);
  assert.throws(() => createOllama({ baseUrl: "https://example.com" }));
  assert.throws(() =>
    createOllama({ baseUrl: "http://user:secret@localhost:11434" }),
  );
  assert.throws(() => createOllama({ model: "gpt-oss:cloud" }));
});
test("concurrent inference is refused and the slot is released after failure", async () => {
  let finish;
  let n = 0;
  const client = createOllama({
    fetchImpl: () => {
      n++;
      return n === 1
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : Promise.resolve(answer());
    },
  });
  const pending = client.ask(schema, "", input);
  await assert.rejects(
    client.ask(schema, "", input),
    (error) => error.status === 429,
  );
  finish({ ok: false, status: 500 });
  await assert.rejects(pending);
  assert.deepEqual(await client.ask(schema, "", input), { name: "Camille" });
});
test("timeout is communicated without exposing provider content", async () => {
  const client = createOllama({
    fetchImpl: async () => {
      throw Object.assign(new Error("private data"), { name: "TimeoutError" });
    },
  });
  await assert.rejects(
    client.ask(schema, "", input),
    (error) => error.status === 504 && !error.message.includes("private data"),
  );
});

test('RH requests plain prose without decoder grammar and validates the response length',async()=>{
 const textSchema=z.object({text:z.string().min(1).max(3000)});let payload;
 const client=createOllama({fetchImpl:async(url,options)=>{payload=JSON.parse(options.body);return answer('Préparer les dossiers clients.');}});
 assert.deepEqual(await client.ask(textSchema,'Keep source facts.',input,{textMode:true}),{text:'Préparer les dossiers clients.'});
 assert.equal(payload.format,undefined);assert.match(payload.messages[0].content,/sans JSON/);assert.ok(!payload.messages[0].content.includes('properties'));
 const invalid=createOllama({fetchImpl:async()=>answer('x'.repeat(3001))});
 await assert.rejects(invalid.ask(textSchema,'',input,{textMode:true}),error=>error.status===502);
});

test('CPU work and context are bounded without truncating a long offer', async () => {
  let payload;
  const client = createOllama({fetchImpl: async (url, options) => {
    payload = JSON.parse(options.body); return answer();
  }});
  for (const size of [100, 8000, 18000]) {
    const text = 'é'.repeat(size / 2);
    await client.ask(z.object({text:z.string()}), '', [{type:'input_text', text}], {textMode:true});
    assert.equal(payload.messages[1].content, text);
    assert.equal(payload.options.num_thread, 4);
    assert.equal(payload.options.num_batch, 128);
    assert.equal(payload.options.num_predict, 2048);
    const bytes = Buffer.byteLength(JSON.stringify(payload.messages));
    assert.ok(payload.options.num_ctx >= bytes + payload.options.num_predict);
    assert.equal(payload.options.num_ctx, size < 6000 ? 8192 : size < 14000 ? 16384 : 32768);
  }
});

test('passage timeout reports its actual limit and releases the request slot', async () => {
  let calls = 0;
  const client = createOllama({fetchImpl: async () => {
    if (++calls === 1) throw Object.assign(Error(), {name:'TimeoutError'});
    return answer();
  }});
  await assert.rejects(client.ask(schema, '', input, {textMode:true,requestTimeoutMs:45000}),
    error => error.status === 504 && /45 secondes/.test(error.message));
  assert.deepEqual(await client.ask(schema, '', input), {name:'Camille'});
});
