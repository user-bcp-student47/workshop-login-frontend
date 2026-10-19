import { describe, expect, it } from 'vitest';
import { formatTaskLabel } from './legacy-format';

describe('formatTaskLabel', () => {
  it('formats priority and owner', () => {
    expect(formatTaskLabel({ priority: 'high', owner: 'student' })).toBe('HIGH · STUDENT');
  });

  it.each([null, undefined])('returns SIN-DATOS for an absent task (%s)', (task) => {
    expect(formatTaskLabel(task)).toBe('SIN-DATOS');
  });

  it.each([
    { task: {}, expected: 'NORMAL · SIN-ASIGNAR' },
    { task: { priority: '', owner: '' }, expected: 'NORMAL · SIN-ASIGNAR' },
    { task: { priority: null, owner: null }, expected: 'NORMAL · SIN-ASIGNAR' },
    { task: { priority: 'high' }, expected: 'HIGH · SIN-ASIGNAR' },
    { task: { owner: 'student' }, expected: 'NORMAL · STUDENT' }
  ])('uses defaults for missing fields: $expected', ({ task, expected }) => {
    expect(formatTaskLabel(task)).toBe(expected);
  });
});
