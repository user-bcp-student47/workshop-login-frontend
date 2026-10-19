import '@angular/compiler';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

const { post } = vi.hoisted(() => ({
  post: vi.fn<(url: string, body: unknown, options: unknown) => Promise<{ data: unknown } | undefined>>()
}));

vi.mock('axios', () => ({ default: { post } }));

describe('AuthService', () => {
  const preferences = { theme: 'light', showTips: true, compact: false };
  let saveSession: ReturnType<typeof vi.fn<SessionService['saveSession']>>;
  let loadPreferences: ReturnType<typeof vi.fn<SessionService['loadPreferences']>>;
  let auth: AuthService;

  beforeEach(() => {
    post.mockReset();
    saveSession = vi.fn<SessionService['saveSession']>();
    loadPreferences = vi.fn<SessionService['loadPreferences']>().mockReturnValue(preferences);
    const session: Pick<SessionService, 'saveSession' | 'loadPreferences'> = { saveSession, loadPreferences };
    auth = new AuthService(session as SessionService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the original login contract and saves the session before returning success', async () => {
    const user = { username: 'student', displayName: 'Student' };
    post.mockResolvedValue({ data: { token: 'test-token', user } });

    const authenticated = await auth.login(' student ', ' Workshop123! ', preferences);

    expect(post).toHaveBeenCalledExactlyOnceWith(
      'http://localhost:8080/auth/login',
      { username: ' student ', password: ' Workshop123! ', client: 'angular-workshop' },
      { timeout: 5000 }
    );
    expect(authenticated).toBe(true);
    expect(saveSession).toHaveBeenCalledExactlyOnceWith('test-token', user, preferences);
  });

  it.each([null, {}, { token: '' }, { token: null }, '', 'not-json', []])('does not save a session when response data lacks a token (%j)', async (data) => {
    post.mockResolvedValue({ data });

    await expect(auth.login('student', 'Workshop123!', preferences)).resolves.toBe(false);

    expect(saveSession).not.toHaveBeenCalled();
  });

  it('does not save a session when the response is absent', async () => {
    post.mockResolvedValue(undefined);

    await expect(auth.login('student', 'Workshop123!', preferences)).resolves.toBe(false);

    expect(saveSession).not.toHaveBeenCalled();
  });

  it('loads preferences through the session owner', () => {
    expect(auth.loadPreferences()).toBe(preferences);
    expect(loadPreferences).toHaveBeenCalledTimes(1);
  });

  it('propagates HTTP failures without saving a session', async () => {
    const failure = new Error('Transport failure');
    post.mockRejectedValue(failure);

    await expect(auth.login('student', 'Workshop123!', preferences)).rejects.toBe(failure);

    expect(saveSession).not.toHaveBeenCalled();
  });

  it('does not report success when session persistence fails', async () => {
    post.mockResolvedValue({ data: { token: 'test-token', user: { username: 'student' } } });
    saveSession.mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    await expect(auth.login('student', 'Workshop123!', preferences)).rejects.toThrow('Storage unavailable');
  });

  it.each([
    { name: 'backend unavailable', error: { code: 'ERR_NETWORK', message: 'Network Error' } },
    { name: 'login timeout', error: { code: 'ECONNABORTED', message: 'timeout of 5000ms exceeded' } },
    { name: 'transport timeout', error: { code: 'ETIMEDOUT', message: 'Request timed out' } },
    { name: 'HTTP 401', error: { response: { status: 401, data: { message: 'Invalid credentials' } } } },
    { name: 'HTTP 403', error: { response: { status: 403, data: { message: 'Forbidden' } } } },
    { name: 'HTTP 500', error: { response: { status: 500, data: { message: 'Private server detail' } } } }
  ])('propagates $name without persistence or automatic retry', async ({ error }) => {
    post.mockRejectedValue(error);

    await expect(auth.login('student', 'Workshop123!', preferences)).rejects.toBe(error);

    expect(post).toHaveBeenCalledExactlyOnceWith(
      'http://localhost:8080/auth/login',
      { username: 'student', password: 'Workshop123!', client: 'angular-workshop' },
      { timeout: 5000 }
    );
    expect(saveSession).not.toHaveBeenCalled();
  });
});