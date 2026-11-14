import { z } from 'zod';
import { ENUMS } from './enums.ts';
export { z };
export const uuid = z.uuid();
export const utcDateTime = z.iso.datetime();
export const alias = (prefix: string) => z.string().regex(new RegExp(`^[${prefix}][1-9][0-9]*$`));
export const IncidentTypeSchema = z.enum(ENUMS.incident_type);
