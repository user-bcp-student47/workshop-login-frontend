import '@angular/compiler';
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardComponent } from './dashboard.component';
import type { SessionService } from '../services/session.service';
import type { TasksService } from '../services/tasks.service';
import type { SessionContext, Task } from '../models/api.models';

describe('DashboardComponent', () => {
  let context: SessionContext;
  let getSession: ReturnType<typeof vi.fn<TasksService['getSession']>>;
  let getTasks: ReturnType<typeof vi.fn<TasksService['getTasks']>>;
  let clearSession: ReturnType<typeof vi.fn<SessionService['clearSession']>>;
  let navigate: ReturnType<typeof vi.fn<(commands: unknown[]) => Promise<boolean>>>;
  let detectChanges: ReturnType<typeof vi.fn<() => void>>;
  let runInZone: ReturnType<typeof vi.fn<(callback: () => void) => void>>;

  function createComponent(): DashboardComponent {
    const router: Pick<Router, 'navigate'> = { navigate };
    const changeDetector: Pick<ChangeDetectorRef, 'detectChanges'> = { detectChanges };
    const zone = { run: runInZone };
    const session: Pick<SessionService, 'clearSession'> = { clearSession };
    const tasks: Pick<TasksService, 'getSession' | 'getTasks'> = { getSession, getTasks };
    return new DashboardComponent(
      router as Router,
      changeDetector as ChangeDetectorRef,
      zone as unknown as NgZone,
      tasks as TasksService,
      session as SessionService
    );
  }

  beforeEach(() => {
    context = { token: 'test-token', user: { username: 'student', displayName: 'Student' } };
    getSession = vi.fn<TasksService['getSession']>().mockImplementation(() => context);
    getTasks = vi.fn<TasksService['getTasks']>().mockResolvedValue([]);
    clearSession = vi.fn<SessionService['clearSession']>();
    navigate = vi.fn<(commands: unknown[]) => Promise<boolean>>().mockResolvedValue(true);
    detectChanges = vi.fn<() => void>();
    runInZone = vi.fn<(callback: () => void) => void>((callback) => callback());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates the query, filters archived tasks, adds labels and preserves current ordering', async () => {
    const component = createComponent();
    const tasks = [
      { title: 'High', status: 'TODO', priority: 'high', owner: 'student' },
      { title: 'Archived', status: 'ARCHIVED', priority: 'urgent', owner: 'student' },
      { title: 'Normal', status: 'IN_PROGRESS', priority: 'normal', owner: 'trainer' },
      { title: 'Low', status: 'DONE', priority: 'low', owner: 'student' }
    ];
    getTasks.mockImplementation(async () => {
      expect(getSession).toHaveBeenCalledTimes(1);
      return tasks;
    });

    await component.ngOnInit();

    expect(getTasks).toHaveBeenCalledExactlyOnceWith({ owner: 'student' }, 'test-token');
    expect(component.tasks).toBe(tasks);
    expect(component.visibleTasks).toEqual([
      { title: 'Normal', status: 'IN_PROGRESS', priority: 'normal', owner: 'trainer', label: 'NORMAL \u00b7 TRAINER' },
      { title: 'Low', status: 'DONE', priority: 'low', owner: 'student', label: 'LOW \u00b7 STUDENT' },
      { title: 'High', status: 'TODO', priority: 'high', owner: 'student', label: 'HIGH \u00b7 STUDENT' }
    ]);
    expect(tasks[1]).toEqual({ title: 'Archived', status: 'ARCHIVED', priority: 'urgent', owner: 'student' });
    expect(component.user).toEqual({ username: 'student', displayName: 'Student' });
    expect(component.loading).toBe(false);
    expect(component.error).toBe('');
    expect(runInZone).toHaveBeenCalledTimes(1);
    expect(detectChanges).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('delegates the original owner without encoding it in the component', async () => {
    context.user = { username: 'student name&team=local' };

    await createComponent().ngOnInit();

    expect(getTasks).toHaveBeenCalledExactlyOnceWith({ owner: 'student name&team=local' }, 'test-token');
  });

  it('queries with an empty owner when the service returns an empty user', async () => {
    context.user = {};
    const component = createComponent();

    await component.ngOnInit();

    expect(getTasks).toHaveBeenCalledExactlyOnceWith({ owner: '' }, 'test-token');
    expect(component.user).toEqual({});
  });

  it.each([null, ''])('redirects without querying tasks when the token is absent (%s)', async (token) => {
    context.token = token;
    const component = createComponent();

    await component.ngOnInit();

    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/login']);
    expect(getTasks).not.toHaveBeenCalled();
    expect(detectChanges).not.toHaveBeenCalled();
  });

  it('propagates a session read error before querying tasks', async () => {
    getSession.mockImplementation(() => {
      throw new SyntaxError('Malformed stored user');
    });
    const component = createComponent();

    await expect(component.ngOnInit()).rejects.toThrow(SyntaxError);

    expect(getTasks).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(component.loading).toBe(true);
    expect(runInZone).not.toHaveBeenCalled();
  });

  it.each([42, 'student', ['student']])('keeps an empty owner for a scalar or array user (%j)', async (user) => {
    context.user = user;

    await createComponent().ngOnInit();

    expect(getTasks).toHaveBeenCalledExactlyOnceWith({ owner: '' }, 'test-token');
  });

  it('delegates numeric usernames as text without changing the owner', async () => {
    context.user = { username: 123, displayName: 'Student' };

    await createComponent().ngOnInit();

    expect(getTasks).toHaveBeenCalledExactlyOnceWith({ owner: '123' }, 'test-token');
  });

  it('does not query or repair a null session user when a token exists', async () => {
    context.user = null;
    const component = createComponent();

    await component.ngOnInit();

    expect(component.user).toBeNull();
    expect(getTasks).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(component.loading).toBe(false);
    expect(component.error).toBeTruthy();
    expect(context.user).toBeNull();
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('finishes loading with an empty task list', async () => {
    const component = createComponent();

    await component.ngOnInit();

    expect(component.tasks).toEqual([]);
    expect(component.visibleTasks).toEqual([]);
    expect(component.loading).toBe(false);
    expect(component.error).toBe('');
    expect(detectChanges).toHaveBeenCalledTimes(1);
  });

  it('uses default labels and only excludes the exact ARCHIVED status', async () => {
    const component = createComponent();
    getTasks.mockResolvedValue([{ title: 'Unassigned', status: 'archived' }]);

    await component.ngOnInit();

    expect(component.visibleTasks).toEqual([
      { title: 'Unassigned', status: 'archived', label: 'NORMAL \u00b7 SIN-ASIGNAR' }
    ]);
  });

  it.each([
    { error: { response: { data: { detail: 'Backend detail' } }, message: 'Transport message' }, expected: 'Backend detail' },
    { error: { response: { data: { detail: '' } }, message: 'Transport message' }, expected: 'Transport message' },
    { error: {}, expected: 'No se pudo cargar el dashboard' }
  ])('does not expose internal task error details: $expected', async ({ error }) => {
    const component = createComponent();
    getTasks.mockRejectedValue(error);

    await component.ngOnInit();

    expect(component.error).toBe('No se pudo cargar el dashboard. Intente nuevamente.');
    expect(component.loading).toBe(false);
    expect(runInZone).toHaveBeenCalledTimes(1);
    expect(detectChanges).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(clearSession).not.toHaveBeenCalled();
    expect(context.token).toBe('test-token');
  });

  it.each([401, 403, 500, 503])('does not clear session or redirect after HTTP %s', async (status) => {
    getTasks.mockRejectedValue({ response: { status, data: { detail: 'Access denied' } } });
    const component = createComponent();

    await component.ngOnInit();

    expect(component.error).toBe('No se pudo cargar el dashboard. Intente nuevamente.');
    expect(clearSession).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(component.loading).toBe(false);
  });

  it.each([
    { name: 'backend unavailable', error: { code: 'ERR_NETWORK', message: 'Network Error' } },
    { name: 'CORS rejection', error: new TypeError('Failed to fetch') },
    { name: 'transport timeout', error: { code: 'ECONNABORTED', message: 'Transport timed out' } },
    { name: 'connection timeout', error: { code: 'ETIMEDOUT', message: 'Connection timed out' } }
  ])('ends loading after $name without retrying or removing the session', async ({ error }) => {
    const component = createComponent();
    getTasks.mockRejectedValue(error);

    await component.ngOnInit();

    expect(component.error).toBe('No se pudo cargar el dashboard. Intente nuevamente.');
    expect(component.loading).toBe(false);
    expect(getTasks).toHaveBeenCalledTimes(1);
    expect(clearSession).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(context.token).toBe('test-token');
    expect(runInZone).toHaveBeenCalledTimes(1);
    expect(detectChanges).toHaveBeenCalledTimes(1);
  });

  it.each([
    { name: 'null body', body: null },
    { name: 'undefined body', body: undefined },
    { name: 'object instead of array', body: {} },
    { name: 'unexpected tasks wrapper', body: { tasks: [] } },
    { name: 'null task', body: [null] }
  ])('shows a public error for $name instead of reporting successful loading', async ({ body }) => {
    const component = createComponent();
    getTasks.mockResolvedValue(body as unknown as Task[]);

    await component.ngOnInit();

    expect(component.error).toBe('No se pudo cargar el dashboard. Intente nuevamente.');
    expect(component.loading).toBe(false);
    expect(component.visibleTasks).toEqual([]);
    expect(getTasks).toHaveBeenCalledTimes(1);
    expect(detectChanges).toHaveBeenCalledTimes(1);
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('finishes successfully with no visible tasks when all tasks are archived', async () => {
    const component = createComponent();
    const tasks: Task[] = [
      { title: 'Archived', status: 'ARCHIVED', priority: 'high', owner: 'student' }
    ];
    getTasks.mockResolvedValue(tasks);

    await component.ngOnInit();

    expect(component.tasks).toBe(tasks);
    expect(component.visibleTasks).toEqual([]);
    expect(component.error).toBe('');
    expect(component.loading).toBe(false);
    expect(detectChanges).toHaveBeenCalledTimes(1);
  });

  it.todo('BUG H-07: handle a session read failure with a controlled UI instead of rejecting ngOnInit');
  it.todo('BUG H-07: render a controlled state for a null stored user without dereferencing null');
  it.todo('BUG H-08: reject an empty-string tasks body instead of treating it as an empty task array');
  it.todo('BUG H-09: handle a session-clear failure during logout without an unhandled rejection');
  it.todo('BUG H-09: handle rejected logout navigation with a controlled UI');

  it.each([
    ['todo', 'Por hacer'],
    ['IN_PROGRESS', 'En progreso'],
    ['DONE', 'Completado'],
    ['RESUELTO', 'Resuelto'],
    ['COMPLETED', 'Completado'],
    ['CUSTOM', 'CUSTOM'],
    ['', '']
  ])('formats status %s as %s', (status, label) => {
    expect(createComponent().statusLabel(status)).toBe(label);
  });

  it('delegates clearing the session before navigating on logout without querying tasks', async () => {
    const component = createComponent();
    navigate.mockImplementation(async () => {
      expect(clearSession).toHaveBeenCalledTimes(1);
      return true;
    });

    await component.logout();

    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/login']);
    expect(getTasks).not.toHaveBeenCalled();
  });
});