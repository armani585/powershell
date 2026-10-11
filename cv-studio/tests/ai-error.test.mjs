import test from 'node:test';
import assert from 'node:assert/strict';
import { aiErrorMessage } from '../lib/ai-error.mjs';
test('insufficient quota identifies API billing and keeps non-AI actions available', () => {
  const message = aiErrorMessage({ status: 429, code: 'insufficient_quota' });
  assert.match(message, /projet API OpenAI est insuffisant/);
  assert.match(message, /exporter le PDF sans IA/);
});
test('temporary rate limits do not instruct the user to buy credits', () => {
  const message = aiErrorMessage({ status: 429, code: 'rate_limit_exceeded' });
  assert.match(message, /Attendez/);
  assert.doesNotMatch(message, /facturation|insuffisant/);
});
test('unknown 429 responses do not assert that quota is exhausted', () => {
  const message = aiErrorMessage({ status: 429 });
  assert.match(message, /ne permet pas de confirmer/);
  assert.doesNotMatch(message, /facturation|insuffisant/);
});
test('nested provider codes are understood without echoing private errors', () => {
  const message = aiErrorMessage({ status: 429, error: { code: 'insufficient_quota' }, message: 'private provider details' });
  assert.match(message, /facturation/);
  assert.doesNotMatch(message, /private provider details/);
});
