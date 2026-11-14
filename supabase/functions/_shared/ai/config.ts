export type LlmConfig = Readonly<{
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  maxOutputTokens: number;
}>;

export function readLlmConfig(
  env: Readonly<Record<string, string | undefined>>,
): LlmConfig {
  const required = (name: string): string => {
    const value = env[name]?.trim();
    if (!value || /[\r\n]/.test(value)) throw new Error(`Invalid ${name}`);
    return value;
  };
  const integer = (name: string, fallback: number): number => {
    if (env[name] === undefined) return fallback;
    const value = Number(env[name]);
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid ${name}`);
    return value;
  };
  const apiKey = required('LLM_API_KEY');
  const rawUrl = required('LLM_BASE_URL');
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new Error('Invalid LLM_BASE_URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Invalid LLM_BASE_URL');
  }
  return Object.freeze({
    apiKey,
    baseUrl: url.toString().replace(/\/+$/, ''),
    model: required('LLM_MODEL'),
    timeoutMs: integer('AI_MAX_REQUEST_MS', 35000),
    maxOutputTokens: integer('AI_MAX_OUTPUT_TOKENS', 1200),
  });
}
