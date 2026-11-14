import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import {Platform} from 'react-native';

// Session JSON can exceed SecureStore's per-value size. Publish a generation only
// after every encrypted chunk is written; an interrupted write keeps the old session.
const queues = new Map<string, Promise<unknown>>();
function serial<T>(key: string, work: () => Promise<T>): Promise<T> {
  const result = (queues.get(key) ?? Promise.resolve()).catch(() => {}).then(work);
  queues.set(key, result);
  void result.finally(() => {if (queues.get(key) === result) queues.delete(key);}).catch(() => {});
  return result;
}
type Manifest = {generation: string; count: number};
async function manifest(key: string): Promise<Manifest | null> {
  const value = await SecureStore.getItemAsync(key);
  if (!value) return null;
  let parsed: Manifest;
  try {parsed = JSON.parse(value) as Manifest;} catch {return null;}
  if (!parsed || typeof parsed !== 'object') return null;
  if (!/^[\w-]+$/.test(parsed.generation) || !Number.isInteger(parsed.count) || parsed.count < 1 || parsed.count > 100) return null;
  return parsed;
}
async function clean(key: string, value: Manifest | null) {
  if (value) await Promise.all(Array.from({length: value.count}, (_, n) => SecureStore.deleteItemAsync(`${key}.${value.generation}.${n}`)));
}
export const sessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
    return serial(key, async () => {
      const stored = await manifest(key);
      if (!stored) return null;
      const chunks = await Promise.all(Array.from({length: stored.count}, (_, n) => SecureStore.getItemAsync(`${key}.${stored.generation}.${n}`)));
      return chunks.some(chunk => chunk === null) ? null : chunks.join('');
    });
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {window.localStorage.setItem(key, value); return;}
    return serial(key, async () => {
      const previous = await manifest(key);
      // Split by code point so an emoji is never split across encrypted values.
      const points = Array.from(value);
      const next = {generation: Crypto.randomUUID(), count: Math.max(1, Math.ceil(points.length / 400))};
      if (next.count > 100) throw new Error('SESSION_STORAGE_LIMIT');
      try {
        await Promise.all(Array.from({length: next.count}, (_, n) => SecureStore.setItemAsync(`${key}.${next.generation}.${n}`, points.slice(n * 400, (n + 1) * 400).join(''))));
      } catch (error) {await clean(key, next).catch(() => {}); throw error;}
      await SecureStore.setItemAsync(key, JSON.stringify(next));
      await clean(key, previous).catch(() => {});
    });
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {window.localStorage.removeItem(key); return;}
    return serial(key, async () => {
      const previous = await manifest(key);
      await SecureStore.deleteItemAsync(key);
      await clean(key, previous);
    });
  },
};
