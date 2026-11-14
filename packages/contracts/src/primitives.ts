import { z } from 'zod';
import { Uuid } from './common.ts';
import { IncidentType } from './enums.ts';
export { z };
export const uuid = Uuid;
export const utcDateTime = z.iso.datetime();
export const alias = (prefix: string) => z.string().regex(new RegExp(`^[${prefix}][1-9][0-9]*$`));
export const IncidentTypeSchema = IncidentType;
