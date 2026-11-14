import type { Context } from 'hono';
import type { AuthUser, Deps } from '../ports.ts';

export type Env = {
  Variables: {
    requestId: string;
    user: AuthUser;
    deps: Deps;
  };
};

export type Ctx = Context<Env>;

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
