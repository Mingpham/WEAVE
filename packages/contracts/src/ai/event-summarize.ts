import { z } from '../primitives.ts';

const item = z.strictObject({ text: z.string(), refs: z.array(z.string()).min(1) });
export const EventSummarizeOutputSchema = z.strictObject({ headline: z.string(), went_well: z.array(item).max(5), went_wrong: z.array(item).max(5), lessons: z.array(item).max(5) });
export type EventSummarizeOutput = z.infer<typeof EventSummarizeOutputSchema>;
