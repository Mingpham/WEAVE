import {sessionStorage} from '../src/lib/session-storage';
import {afterEach, describe, expect, it, vi} from 'vitest';
const store = vi.hoisted(() => new Map<string, string>());
const fail = vi.hoisted(() => ({nextChunk: false}));
vi.mock('react-native', () => ({Platform: {OS: 'android'}}));
vi.mock('expo-crypto', () => ({randomUUID: () => String(Math.random()).replace('.', '-')}));
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => store.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    if (fail.nextChunk && key.includes('.')) {fail.nextChunk = false; throw new Error('interrupted');}
    store.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {store.delete(key);}),
}));

afterEach(() => {store.clear(); fail.nextChunk = false;});
describe('encrypted session persistence', () => {
  it('round-trips a large Unicode session and removes every live chunk on sign-out', async () => {
    const value = ('a'.repeat(399) + '\u{1f600}-\u00e4-\u4e2d').repeat(20);
    await sessionStorage.setItem('auth-session', value);
    expect([...store.values()].every(chunk => new TextEncoder().encode(chunk).byteLength < 2048)).toBe(true);
    expect(await sessionStorage.getItem('auth-session')).toBe(value);
    await sessionStorage.removeItem('auth-session');
    expect(await sessionStorage.getItem('auth-session')).toBeNull();
    expect(store.size).toBe(0);
  });
  it('keeps the last complete session when a replacement write is interrupted', async () => {
    await sessionStorage.setItem('auth-session', 'previous-session');
    fail.nextChunk = true;
    await expect(sessionStorage.setItem('auth-session', 'replacement-session')).rejects.toThrow();
    expect(await sessionStorage.getItem('auth-session')).toBe('previous-session');
  });
  it('serializes concurrent refresh writes and sign-out without resurrecting tokens', async () => {
    await Promise.all([sessionStorage.setItem('auth-session', 'first'), sessionStorage.setItem('auth-session', 'refreshed'), sessionStorage.removeItem('auth-session')]);
    expect(await sessionStorage.getItem('auth-session')).toBeNull();
  });
});
