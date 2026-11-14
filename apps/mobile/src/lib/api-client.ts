import type {z} from 'zod';

export class ApiFailure extends Error {
  constructor(readonly code: string) {super(code);}
}
type Mutation = {method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; key: string};
export class ApiClient {
  constructor(private base: string, private publishableKey: string,
    private token: () => Promise<string | null>, private transport: typeof fetch = fetch) {}
  async request<T>(path: string, schema: z.ZodType<T>, mutation?: Mutation): Promise<T> {
    const token = await this.token();
    if (!token) throw new ApiFailure('UNAUTHENTICATED');
    if (!this.base) throw new ApiFailure('SERVICE_UNAVAILABLE');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await this.transport(`${this.base.replace(/\/$/, '')}/v1${path}`, {
        method: mutation?.method ?? 'GET', signal: controller.signal,
        headers: {Authorization: `Bearer ${token}`, apikey: this.publishableKey,
          ...(mutation ? {'Content-Type': 'application/json', 'X-Idempotency-Key': mutation.key} : {})},
        ...(mutation?.body === undefined ? {} : {body: JSON.stringify(mutation.body)}),
      });
      const envelope = await response.json().catch(() => null);
      if (!response.ok) throw new ApiFailure(envelope?.error?.code ??
        (response.status === 404 ? 'SERVICE_UNAVAILABLE' : response.status === 401 ? 'UNAUTHENTICATED' : 'INTERNAL'));
      const result = schema.safeParse(envelope?.data);
      if (!result.success) throw new ApiFailure('INTERNAL');
      return result.data;
    } catch (error) {
      if (error instanceof ApiFailure) throw error;
      throw new ApiFailure('NETWORK_ERROR');
    } finally {clearTimeout(timer);}
  }
}
