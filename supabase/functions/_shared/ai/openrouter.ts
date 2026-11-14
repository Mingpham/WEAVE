import type { LlmConfig } from './config.ts';
import type { ModelPort, ModelRequest, ModelResponse } from './types.ts';

export type ModelErrorCode =
  'TIMEOUT' | 'NETWORK_ERROR' | 'HTTP_ERROR' | 'SCHEMA_RESPONSE' | 'CONFIG_ERROR' | 'CANCELLED';
export class ModelError extends Error {
  constructor(
    readonly code: ModelErrorCode,
    readonly status: number | null = null,
  ) {
    super(code);
    this.name = 'ModelError';
  }
}
const record = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const tokenCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export function createOpenRouterClient(config: LlmConfig, fetchImpl: typeof fetch): ModelPort {
  return {
    async complete(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
      if (signal?.aborted) throw new ModelError('CANCELLED');
      if (
        Array.isArray(request.userContent) &&
        request.userContent.some(
          (part) =>
            part.type === 'image_url' &&
            !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(part.image_url.url),
        )
      ) {
        throw new ModelError('CONFIG_ERROR');
      }
      const controller = new AbortController();
      const start = performance.now();
      let timedOut = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let cancel = () => {};
      const interrupted = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(new ModelError('TIMEOUT'));
        }, config.timeoutMs);
        cancel = () => {
          controller.abort();
          reject(new ModelError('CANCELLED'));
        };
        signal?.addEventListener('abort', cancel, { once: true });
      });
      const perform = async (): Promise<ModelResponse> => {
        const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
          method: 'POST',
          redirect: 'error',
          signal: controller.signal,
          headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.model,
            max_tokens: config.maxOutputTokens,
            stream: false,
            messages: [
              { role: 'system', content: request.system },
              { role: 'user', content: request.userContent },
            ],
            provider: { require_parameters: true },
            response_format: {
              type: 'json_schema',
              json_schema: { name: request.module, strict: true, schema: request.jsonSchema },
            },
          }),
        });
        if (!response.ok) {
          await response.body?.cancel();
          throw new ModelError('HTTP_ERROR', response.status);
        }
        let raw: unknown;
        try {
          raw = await response.json();
        } catch {
          if (controller.signal.aborted) throw new ModelError(timedOut ? 'TIMEOUT' : 'CANCELLED');
          throw new ModelError('SCHEMA_RESPONSE');
        }
        const data = record(raw);
        if (!data) throw new ModelError('SCHEMA_RESPONSE');
        if (data.error) {
          const status = record(data.error)?.code;
          throw new ModelError(
            'HTTP_ERROR',
            typeof status === 'number' && status >= 400 && status <= 599 ? status : response.status,
          );
        }
        const choice = Array.isArray(data.choices) ? record(data.choices[0]) : null;
        const message = record(choice?.message);
        if (
          choice?.finish_reason !== 'stop' ||
          typeof message?.content !== 'string' ||
          !message.content.trim()
        )
          throw new ModelError('SCHEMA_RESPONSE');
        const usage = record(data.usage);
        return {
          rawContent: message.content,
          requestedModel: config.model,
          actualModel: typeof data.model === 'string' ? data.model : null,
          requestId: typeof data.id === 'string' ? data.id : null,
          usage:
            tokenCount(usage?.prompt_tokens) && tokenCount(usage?.completion_tokens)
              ? { inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens }
              : null,
          latencyMs: Math.max(0, Math.round(performance.now() - start)),
        };
      };
      try {
        return await Promise.race([perform(), interrupted]);
      } catch (error) {
        if (timedOut) throw new ModelError('TIMEOUT');
        if (signal?.aborted) throw new ModelError('CANCELLED');
        if (error instanceof ModelError) throw error;
        throw new ModelError('NETWORK_ERROR');
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
      }
    },
  };
}
