/**
 * Single import point for `packages/contracts` inside the Edge Function.
 *
 * SPIKE (ADR §6): confirm that `supabase functions deploy api` bundles this relative import
 * from outside `supabase/functions/`. If it does not, the fallback in the ADR applies.
 */
export * from '../../../packages/contracts/src/index.ts';
