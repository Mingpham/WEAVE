import { describe, expect, it } from 'vitest';
import { readLlmConfig } from '../config.ts';

const env = {
  LLM_API_KEY: 'test-secret-do-not-print',
  LLM_BASE_URL: 'https://openrouter.ai/api/v1///',
  LLM_MODEL: 'test/model',
};

describe('INV-12 server LLM configuration', () => {
  it('normalizes the base path and bounds calls with default limits', () => {
    expect(readLlmConfig(env)).toEqual({
      apiKey: 'test-secret-do-not-print', baseUrl: 'https://openrouter.ai/api/v1',
      model: 'test/model', timeoutMs: 35000, maxOutputTokens: 1200,
    });
  });
  it.each(['LLM_API_KEY', 'LLM_BASE_URL', 'LLM_MODEL'])('rejects missing %s without echoing env', (key) => {
    expect(() => readLlmConfig({ ...env, [key]: ' ' })).toThrow(`Invalid ${key}`);
    try { readLlmConfig({ ...env, [key]: '' }); } catch (error) {
      expect(String(error)).not.toContain(env.LLM_API_KEY);
    }
  });
  it.each(['http://example.com/v1', 'not a url', 'https://user:pass@example.com/v1', 'https://example.com/v1?key=secret', 'https://example.com/v1#fragment'])('rejects unsafe endpoint %s', (url) => {
    expect(() => readLlmConfig({ ...env, LLM_BASE_URL: url })).toThrow('Invalid LLM_BASE_URL');
  });
  it.each(['0', '-1', 'NaN', '1.5', 'Infinity', ''])('rejects invalid configured numeric limits: %s', (value) => {
    expect(() => readLlmConfig({ ...env, AI_MAX_REQUEST_MS: value })).toThrow('Invalid AI_MAX_REQUEST_MS');
    expect(() => readLlmConfig({ ...env, AI_MAX_OUTPUT_TOKENS: value })).toThrow('Invalid AI_MAX_OUTPUT_TOKENS');
  });
  it('accepts explicit positive integer limits without mutating input', () => {
    const input = Object.freeze({ ...env, AI_MAX_REQUEST_MS: '1000', AI_MAX_OUTPUT_TOKENS: '256' });
    expect(readLlmConfig(input)).toMatchObject({ timeoutMs: 1000, maxOutputTokens: 256 });
  });
});
