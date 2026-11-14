import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseSmokeArgs, runSmoke } from './smoke-runner.ts';
import { ModelError } from '../../supabase/functions/_shared/ai/openrouter.ts';
import type { LlmConfig } from '../../supabase/functions/_shared/ai/config.ts';
import { modelResponse } from './support/fake-model.ts';

const args = ['--case', 'text-schema', '--max-calls', '1', '--max-output-tokens', '256'];
const env = {
  LLM_API_KEY: 'key-sentinel',
  LLM_BASE_URL: 'https://openrouter.ai/api/v1',
  LLM_MODEL: 'test/model',
};
it.each(
  [
    [],
    ['--case', 'text-schema'],
    [...args, '--max-calls', '2'],
    ['--case', 'unknown', ...args.slice(2)],
    [...args, '--extra', 'x'],
  ].map((input) => ({ input })),
)('requires explicit bounded invocation: $input', ({ input }) => {
  expect(() => parseSmokeArgs(input)).toThrow('INVALID_SMOKE_ARGS');
});
it('caps timeout/output, calls once, and emits metadata without raw output or secrets', async () => {
  let config: LlmConfig | undefined;
  let calls = 0;
  const report = await runSmoke(parseSmokeArgs(args), env, (given) => {
    config = given;
    return {
      complete: async (request) => {
        calls++;
        expect(request.promptVersion).toBe('wp0-smoke-v1');
        return { ...modelResponse, rawContent: '{"ok":true}' };
      },
    };
  });
  expect(config).toMatchObject({ timeoutMs: 35000, maxOutputTokens: 256 });
  expect(calls).toBe(1);
  expect(report.status).toBe('PASS');
  expect(report).not.toHaveProperty('rawContent');
  expect(JSON.stringify(report)).not.toContain('sentinel');
});
it('validates content against the smoke schema rather than reporting any JSON as success', async () => {
  const report = await runSmoke(parseSmokeArgs(args), env, () => ({
    complete: async () => ({ ...modelResponse, rawContent: '{"ok":false,"private":"sentinel"}' }),
  }));
  expect(report).toMatchObject({ status: 'FAIL', error_code: 'SMOKE_OUTPUT_INVALID' });
  expect(JSON.stringify(report)).not.toContain('sentinel');
});
it('does not retry a timed-out or rejected request', async () => {
  let calls = 0;
  const report = await runSmoke(parseSmokeArgs(args), env, () => ({
    complete: async () => {
      calls++;
      throw new ModelError('HTTP_ERROR', 429);
    },
  }));
  expect(calls).toBe(1);
  expect(report).toMatchObject({
    status: 'FAIL',
    error_code: 'HTTP_ERROR',
    http_status: 429,
    usage: null,
  });
});
it('validates explicit arguments before reading credentials or creating a transport', async () => {
  let started = false;
  await expect(
    runSmoke({ case: 'text-schema', maxCalls: 2, maxOutputTokens: 256 } as never, env, () => {
      started = true;
      throw new Error('sentinel');
    }),
  ).rejects.toThrow('INVALID_SMOKE_ARGS');
  expect(started).toBe(false);
});
it('sends the synthetic PNG and checks its observed color with one request', async () => {
  const image = readFileSync(new URL('./synthetic-red-square.png', import.meta.url));
  let calls = 0;
  const report = await runSmoke(
    parseSmokeArgs(['--case', 'image-schema', ...args.slice(2)]),
    env,
    () => ({
      complete: async (request) => {
        calls++;
        expect(request.userContent).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${image.toString('base64')}` },
            }),
          ]),
        );
        return { ...modelResponse, rawContent: '{"color":"red"}' };
      },
    }),
    image,
  );
  expect(calls).toBe(1);
  expect(report.status).toBe('PASS');
  expect(report.fixture_sha256).toMatch(/^[0-9a-f]{64}$/);
});
it('rejects a missing image before spending a call', async () => {
  let calls = 0;
  await expect(
    runSmoke(parseSmokeArgs(['--case', 'image-schema', ...args.slice(2)]), env, () => ({
      complete: async () => {
        calls++;
        return modelResponse;
      },
    })),
  ).rejects.toThrow('SMOKE_IMAGE_REQUIRED');
  expect(calls).toBe(0);
});
