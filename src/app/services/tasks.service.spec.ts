import '@angular/compiler';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from './session.service';
import { TasksService } from './tasks.service';

const { get } = vi.hoisted(() => ({
  get: vi.fn<(url: string, options: unknown) => Promise<{ data: unknown }>>()
}));

vi.mock('axios', () => ({ default: { get } }));

describe('TasksService', () => {
  let getToken: ReturnType<typeof vi.fn<SessionService['getToken']>>;
  let getUser: ReturnType<typeof vi.fn<SessionService['getUser']>>;
  let tasks: TasksService;

  beforeEach(() => {
    get.mockReset();
    getToken = vi.fn<SessionService['getToken']>().mockReturnValue('test-token');
    getUser = vi.fn<SessionService['getUser']>().mockReturnValue({ username: 'student' });
    const session: Pick<SessionService, 'getToken' | 'getUser'> = { getToken, getUser };
    tasks = new TasksService(session as SessionService);
  });

  it('reads token and user through the session owner in the existing order', () => {
    getUser.mockImplementation(() => {
      expect(getToken).toHaveBeenCalledTimes(1);
      return { username: 'student' };
    });

    expect(tasks.getSession()).toEqual({ token: 'test-token', user: { username: 'student' } });
    expect(get).not.toHaveBeenCalled();
  });

  it('still reads the user when no token is present without making HTTP calls', () => {
    getToken.mockReturnValue(null);

    expect(tasks.getSession()).toEqual({ token: null, user: { username: 'student' } });
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(get).not.toHaveBeenCalled();
  });

  it('propagates malformed user JSON without starting HTTP', () => {
    getUser.mockImplementation(() => {
      throw new SyntaxError('Malformed stored user');
    });

    expect(() => tasks.getSession()).toThrow(SyntaxError);
    expect(get).not.toHaveBeenCalled();
  });

  it('preserves the tasks request and returns the same array without view transformations', async () => {
    const responseTasks = [
      { title: 'Archived', status: 'ARCHIVED', priority: 'high', owner: 'student' },
      { title: 'Active', status: 'TODO', priority: 'low', owner: 'student' }
    ];
    get.mockResolvedValue({ data: responseTasks });

    await expect(tasks.getTasks({ owner: 'student' }, 'test-token')).resolves.toBe(responseTasks);

    expect(get).toHaveBeenCalledExactlyOnceWith('http://localhost:8000/api/tasks?owner=student', {
      headers: { Authorization: 'Bearer test-token' }
    });
    expect(responseTasks).toEqual([
      { title: 'Archived', status: 'ARCHIVED', priority: 'high', owner: 'student' },
      { title: 'Active', status: 'TODO', priority: 'low', owner: 'student' }
    ]);
  });

  it.each(['', 'student name&team=local'])('preserves the raw owner value (%s)', async (owner) => {
    get.mockResolvedValue({ data: [] });

    await tasks.getTasks({ owner }, 'test-token');

    expect(get).toHaveBeenCalledExactlyOnceWith('http://localhost:8000/api/tasks?owner=' + owner, {
      headers: { Authorization: 'Bearer test-token' }
    });
  });

  it('propagates HTTP errors without replacing their response data', async () => {
    const failure = { response: { status: 401, data: { detail: 'Access denied' } } };
    get.mockRejectedValue(failure);

    await expect(tasks.getTasks({ owner: 'student' }, 'test-token')).rejects.toBe(failure);
  });

  it.each([
    { name: 'backend unavailable', error: { code: 'ERR_NETWORK', message: 'Network Error' } },
    { name: 'transport timeout', error: { code: 'ECONNABORTED', message: 'Transport timed out' } },
    { name: 'connection timeout', error: { code: 'ETIMEDOUT', message: 'Connection timed out' } },
    { name: 'HTTP 403', error: { response: { status: 403, data: { detail: 'Forbidden' } } } },
    { name: 'HTTP 500', error: { response: { status: 500, data: { detail: 'Private server detail' } } } },
    { name: 'HTTP 503', error: { response: { status: 503, data: { detail: 'Service unavailable' } } } }
  ])('propagates $name with the original Bearer contract and without retry', async ({ error }) => {
    get.mockRejectedValue(error);

    await expect(tasks.getTasks({ owner: 'student' }, 'test-token')).rejects.toBe(error);

    expect(get).toHaveBeenCalledExactlyOnceWith('http://localhost:8000/api/tasks?owner=student', {
      headers: { Authorization: 'Bearer test-token' }
    });
  });
});