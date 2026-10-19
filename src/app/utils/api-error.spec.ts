import { describe, expect, it } from 'vitest';
import { getApiErrorMessage } from './api-error';

describe('getApiErrorMessage', () => {
  it.each([
    undefined,
    null,
    'Private transport detail',
    new Error('Private exception detail'),
    { response: { status: 401, data: { message: 'Private login detail', detail: 'Private task detail' } } },
    { response: { status: 500, data: { detail: '<strong>Private HTML</strong>' } } }
  ])('returns only the public login message for error %j', (error) => {
    expect(getApiErrorMessage(error, 'login')).toBe('No se pudo autenticar. Intente nuevamente.');
  });

  it.each([
    undefined,
    null,
    'Private transport detail',
    new Error('Private exception detail'),
    { response: { status: 403, data: { detail: 'Private task detail' } } },
    { response: { status: 500, data: { message: '<strong>Private HTML</strong>' } } }
  ])('returns only the public tasks message for error %j', (error) => {
    expect(getApiErrorMessage(error, 'tasks')).toBe('No se pudo cargar el dashboard. Intente nuevamente.');
  });

  it('does not inspect untrusted error properties', () => {
    const error = Object.defineProperty({}, 'response', {
      get: () => {
        throw new Error('Untrusted getter');
      }
    });

    expect(getApiErrorMessage(error, 'login')).toBe('No se pudo autenticar. Intente nuevamente.');
    expect(getApiErrorMessage(error, 'tasks')).toBe('No se pudo cargar el dashboard. Intente nuevamente.');
  });
});