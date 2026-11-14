import { en } from './en';

export function errorMessage(error: unknown): string {
  const code = typeof error === 'string' ? error : error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  return en.errorCodes[code as keyof typeof en.errorCodes] ?? en.errorCodes.INTERNAL;
}
