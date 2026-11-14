import { createOpenRouterClient } from '../../supabase/functions/_shared/ai/openrouter.ts';
import { parseSmokeArgs, runSmoke } from './smoke-runner.ts';

if (import.meta.main) {
  try {
    const options = parseSmokeArgs(Deno.args);
    const env = Object.fromEntries(
      ['LLM_API_KEY', 'LLM_BASE_URL', 'LLM_MODEL'].map((name) => [name, Deno.env.get(name)]),
    );
    const image =
      options.case === 'image-schema'
        ? await Deno.readFile(new URL('./synthetic-red-square.png', import.meta.url))
        : undefined;
    const report = await runSmoke(
      options,
      env,
      (config) => createOpenRouterClient(config, fetch),
      image,
    );
    console.log(JSON.stringify(report));
    if (report.status !== 'PASS') Deno.exitCode = 1;
  } catch (error) {
    const code =
      error instanceof Error &&
      ['INVALID_SMOKE_ARGS', 'SMOKE_IMAGE_REQUIRED'].includes(error.message)
        ? error.message
        : 'SMOKE_SETUP_FAILED';
    console.log(JSON.stringify({ status: 'FAIL', error_code: code }));
    Deno.exitCode = 1;
  }
}
