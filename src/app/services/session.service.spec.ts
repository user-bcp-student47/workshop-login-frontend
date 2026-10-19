import '@angular/compiler';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from './session.service';

describe('SessionService', () => {
  let storedValues: Map<string, string>;
  let storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  let session: SessionService;

  beforeEach(() => {
    storedValues = new Map<string, string>();
    storage = {
      getItem: vi.fn((key: string) => storedValues.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storedValues.set(key, String(value));
      }),
      removeItem: vi.fn((key: string) => {
        storedValues.delete(key);
      })
    };
    vi.stubGlobal('localStorage', storage);
    session = new SessionService();
    vi.mocked(storage.removeItem).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns null when the token is absent', () => {
    expect(session.getToken()).toBeNull();
  });

  it('H-01: never restores a token from the legacy storage key', () => {
    storedValues.set('workshop_token', 'legacy-token');

    expect(session.getToken()).toBeNull();
    expect(storage.getItem).not.toHaveBeenCalledWith('workshop_token');
  });

  it('H-01: removes the legacy token when a new session instance starts', () => {
    storedValues.set('workshop_token', 'legacy-token');

    const newSession = new SessionService();

    expect(newSession.getToken()).toBeNull();
    expect(storedValues.has('workshop_token')).toBe(false);
    expect(storage.removeItem).toHaveBeenCalledWith('workshop_token');
  });

  it('H-01: keeps the token in the same instance but not across reload-equivalent instances', () => {
    const preferences = { theme: 'light', showTips: true, compact: false };
    session.saveSession('test-token', { username: 'student' }, preferences);

    expect(session.getToken()).toBe('test-token');
    expect(storedValues.has('workshop_token')).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalledWith('workshop_token', expect.anything());

    const reloadedSession = new SessionService();

    expect(reloadedSession.getToken()).toBeNull();
    expect(reloadedSession.getUser()).toEqual({ username: 'student' });
    expect(reloadedSession.loadPreferences()).toEqual(preferences);
  });

  it('H-01: reports denied legacy cleanup on save without restoring the old token', () => {
    storedValues.set('workshop_token', 'legacy-token');
    vi.mocked(storage.removeItem).mockImplementation(() => {
      throw new Error('Storage removal denied');
    });
    let deniedSession!: SessionService;

    expect(() => {
      deniedSession = new SessionService();
    }).not.toThrow();

    expect(deniedSession.getToken()).toBeNull();
    expect(() => deniedSession.saveSession('new-token', {}, session.loadPreferences())).toThrow();
    expect(deniedSession.getToken()).toBeNull();
    expect(storedValues.get('workshop_token')).toBe('legacy-token');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('H-01: permits saving only after a denied legacy cleanup can succeed', () => {
    storedValues.set('workshop_token', 'legacy-token');
    vi.mocked(storage.removeItem).mockImplementation(() => {
      throw new Error('Storage removal denied');
    });
    const deniedSession = new SessionService();

    expect(() => deniedSession.saveSession('new-token', {}, session.loadPreferences())).toThrow();

    vi.mocked(storage.removeItem).mockImplementation((key: string) => {
      storedValues.delete(key);
    });
    deniedSession.saveSession('new-token', { username: 'student' }, session.loadPreferences());

    expect(deniedSession.getToken()).toBe('new-token');
    expect(storedValues.has('workshop_token')).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalledWith('workshop_token', expect.anything());
  });

  it('returns an empty object when the user key is absent', () => {
    expect(session.getUser()).toEqual({});
  });

  it('retains all fields of the stored user', () => {
    const user = { username: 'student', displayName: 'Student', additionalField: 'retained' };
    storedValues.set('workshop_user', JSON.stringify(user));

    expect(session.getUser()).toEqual(user);
  });

  it('does not silently repair malformed stored user JSON', () => {
    storedValues.set('workshop_user', '{invalid-json');

    expect(() => session.getUser()).toThrow(SyntaxError);
  });

  it('preserves parseable user values without adding a new validation policy', () => {
    storedValues.set('workshop_user', 'null');

    expect(session.getUser()).toBeNull();
  });

  it('returns a fresh set of default preferences on each load', () => {
    const preferences = session.loadPreferences();
    preferences.theme = 'changed';

    expect(session.loadPreferences()).toEqual({ theme: 'light', showTips: true, compact: false });
  });

  it('merges defaults with false, null and nested saved preferences', () => {
    storedValues.set('workshop_preferences', JSON.stringify({
      theme: null,
      showTips: false,
      savedOptions: { notifications: { enabled: false }, sections: ['tasks'] }
    }));

    expect(session.loadPreferences()).toEqual({
      theme: null,
      showTips: false,
      compact: false,
      savedOptions: { notifications: { enabled: false }, sections: ['tasks'] }
    });
  });

  it('returns defaults after malformed preferences without exposing their contents', () => {
    storedValues.set('workshop_preferences', '{invalid-json');

    expect(session.loadPreferences()).toEqual({ theme: 'light', showTips: true, compact: false });
  });

  it('returns defaults when preference storage cannot be read', () => {
    vi.mocked(storage.getItem).mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    expect(session.loadPreferences()).toEqual({ theme: 'light', showTips: true, compact: false });
  });

  it('H-01: persists only user and preferences while retaining the token in memory', () => {
    const user = { username: 'student' };
    const preferences = { theme: 'light', showTips: false, compact: true };

    session.saveSession('test-token', user, preferences);

    expect(storage.setItem).toHaveBeenCalledTimes(2);
    expect(storage.setItem).toHaveBeenNthCalledWith(1, 'workshop_user', JSON.stringify(user));
    expect(storage.setItem).toHaveBeenNthCalledWith(2, 'workshop_preferences', JSON.stringify(preferences));
    expect(storedValues.has('workshop_token')).toBe(false);
    expect(session.getToken()).toBe('test-token');
  });

  it('retains the existing storage coercion when the login response omits user', () => {
    session.saveSession('test-token', undefined, session.loadPreferences());

    expect(storedValues.get('workshop_user')).toBe('undefined');
  });

  it('propagates session write failures rather than reporting a saved session', () => {
    vi.mocked(storage.setItem).mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    expect(() => session.saveSession('test-token', {}, session.loadPreferences())).toThrow('Storage unavailable');
  });

  it('removes token and user while retaining preferences', () => {
    session.saveSession('test-token', { username: 'student' }, session.loadPreferences());
    storedValues.set('workshop_token', 'legacy-token');
    storedValues.set('workshop_user', JSON.stringify({ username: 'student' }));
    storedValues.set('workshop_preferences', JSON.stringify({ compact: true }));

    session.clearSession();

    expect(storage.removeItem).toHaveBeenCalledTimes(2);
    expect(storage.removeItem).toHaveBeenNthCalledWith(1, 'workshop_token');
    expect(storage.removeItem).toHaveBeenNthCalledWith(2, 'workshop_user');
    expect(storedValues.has('workshop_token')).toBe(false);
    expect(storedValues.has('workshop_user')).toBe(false);
    expect(storedValues.get('workshop_preferences')).toBe(JSON.stringify({ compact: true }));
    expect(session.getToken()).toBeNull();
  });
});