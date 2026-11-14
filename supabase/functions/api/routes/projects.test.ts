import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.ts';
import { testDeps, fakeAuth } from '../testing/fakes.ts';
import { CreateProjectData } from '../contracts.ts';
import { createProjectBody, createdProject } from '../../../../tests/fixtures/api/projects.ts';
const key = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
function setup(anonymous = false) {
  const create = vi.fn(async () => ({
    data: CreateProjectData.parse(createdProject),
    stateVersion: 1,
  }));
  const deps = testDeps({
    auth: fakeAuth({ token: { id: createdProject.me.id, isAnonymous: anonymous, email: null } }),
  });
  Object.assign(deps, { projects: { create } });
  return { app: createApp(deps), create };
}
const post = (body: unknown = createProjectBody) => ({
  method: 'POST',
  headers: {
    Authorization: 'Bearer token',
    'Content-Type': 'application/json',
    'X-Idempotency-Key': key,
  },
  body: JSON.stringify(body),
});
describe('real project route boundary', () => {
  it('accepts validated project creation and forwards the original idempotency key to atomic RPC', async () => {
    const { app, create } = setup();
    const response = await app.request('/api/v1/projects', post());
    expect(response.status).toBe(201);
    expect((await response.json()).data.project.id).toBe(createdProject.project.id);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ jwt: 'token' }),
      createProjectBody,
      key,
    );
  });
  it('denies anonymous creation before calling the repository', async () => {
    const { app, create } = setup(true);
    expect((await app.request('/api/v1/projects', post())).status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });
  it('rejects invalid input and missing idempotency key', async () => {
    const { app, create } = setup();
    expect(
      (await app.request('/api/v1/projects', post({ ...createProjectBody, actor: 'owner' })))
        .status,
    ).toBe(422);
    const request = post();
    delete (request.headers as Record<string, string>)['X-Idempotency-Key'];
    expect((await app.request('/api/v1/projects', request)).status).toBe(422);
    expect(create).not.toHaveBeenCalled();
  });
  it('answers browser preflight before authentication', async () => {
    const { app } = setup();
    const response = await app.request('/api/v1/projects', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://127.0.0.1:8081',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type,x-idempotency-key',
      },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Headers')?.toLowerCase()).toContain(
      'x-idempotency-key',
    );
  });
});
