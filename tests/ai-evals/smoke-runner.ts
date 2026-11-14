import { readLlmConfig, type LlmConfig } from '../../supabase/functions/_shared/ai/config.ts';
import { ModelError } from '../../supabase/functions/_shared/ai/openrouter.ts';
import type { ModelPort, ModelRequest } from '../../supabase/functions/_shared/ai/types.ts';

export type SmokeOptions = {
  case: 'text-schema' | 'image-schema';
  maxCalls: 1;
  maxOutputTokens: 256;
};
export function parseSmokeArgs(args: readonly string[]): SmokeOptions {
  const flags = new Map<string, string>();
  if (args.length !== 6) throw new Error('INVALID_SMOKE_ARGS');
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i]!;
    if (!['--case', '--max-calls', '--max-output-tokens'].includes(flag) || flags.has(flag))
      throw new Error('INVALID_SMOKE_ARGS');
    flags.set(flag, args[i + 1]!);
  }
  const chosen = flags.get('--case');
  if (
    (chosen !== 'text-schema' && chosen !== 'image-schema') ||
    flags.get('--max-calls') !== '1' ||
    flags.get('--max-output-tokens') !== '256'
  )
    throw new Error('INVALID_SMOKE_ARGS');
  return { case: chosen, maxCalls: 1, maxOutputTokens: 256 };
}

export async function runSmoke(
  options: SmokeOptions,
  env: Readonly<Record<string, string | undefined>>,
  factory: (config: LlmConfig) => ModelPort,
  image?: Uint8Array,
) {
  if (
    !options ||
    !['text-schema', 'image-schema'].includes(options.case) ||
    options.maxCalls !== 1 ||
    options.maxOutputTokens !== 256
  )
    throw new Error('INVALID_SMOKE_ARGS');
  if (options.case === 'image-schema' && !image?.length) throw new Error('SMOKE_IMAGE_REQUIRED');
  const config = readLlmConfig({ ...env, AI_MAX_REQUEST_MS: '35000', AI_MAX_OUTPUT_TOKENS: '256' });
  const promptVersion = 'wp0-smoke-v1';
  const text =
    options.case === 'text-schema'
      ? 'Return a JSON object with ok equal to true.'
      : 'What is the dominant color of this image? Return the color using the supplied schema.';
  const bytes = options.case === 'image-schema' ? image! : new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  const checksum = Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  const request: ModelRequest = {
    module: options.case === 'text-schema' ? 'event_summarize' : 'observation_analyze',
    promptVersion,
    system: 'Diagnostic transport check. Return only the requested JSON object.',
    userContent:
      options.case === 'text-schema'
        ? text
        : [
            { type: 'text', text },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))}`,
              },
            },
          ],
    jsonSchema:
      options.case === 'text-schema'
        ? {
            type: 'object',
            properties: { ok: { type: 'boolean' } },
            required: ['ok'],
            additionalProperties: false,
          }
        : {
            type: 'object',
            properties: { color: { type: 'string', enum: ['red', 'green', 'blue', 'other'] } },
            required: ['color'],
            additionalProperties: false,
          },
  };
  const metadata = {
    case: options.case,
    recorded_at: new Date().toISOString(),
    requested_model: config.model,
    prompt_version: promptVersion,
    schema_version: promptVersion,
    fixture_sha256: checksum,
    max_calls: 1,
    max_output_tokens: 256,
    timeout_ms: 35000,
    cost: null,
  };
  const started = performance.now();
  try {
    const response = await factory(config).complete(request); // One request. Never retry here.
    let parsed: unknown;
    try {
      parsed = JSON.parse(response.rawContent);
    } catch {
      parsed = null;
    }
    let valid = false;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      Object.keys(parsed).length === 1
    ) {
      valid =
        options.case === 'text-schema'
          ? 'ok' in parsed && parsed.ok === true
          : 'color' in parsed && parsed.color === 'red';
    }
    return {
      ...metadata,
      status: valid ? 'PASS' : 'FAIL',
      error_code: valid ? null : 'SMOKE_OUTPUT_INVALID',
      http_status: null,
      actual_model: response.actualModel,
      request_id: response.requestId,
      usage: response.usage,
      latency_ms: response.latencyMs,
    };
  } catch (cause) {
    const error = cause instanceof ModelError ? cause : new ModelError('NETWORK_ERROR');
    return {
      ...metadata,
      status: 'FAIL',
      error_code: error.code,
      http_status: error.status,
      actual_model: null,
      request_id: null,
      usage: null,
      latency_ms: Math.round(performance.now() - started),
    };
  }
}
