import { allowedTransitions, canTransition, describeTransition } from './task-state-machine';
import { TASK_STATUSES, TaskStatus } from './task.model';

describe('task state machine', () => {
  const valid: [TaskStatus, TaskStatus][] = [
    ['PENDING', 'PROCESSING'],
    ['PROCESSING', 'COMPLETED'],
    ['PROCESSING', 'FAILED'],
    ['PROCESSING', 'PENDING'],
    ['FAILED', 'RETRYING'],
    ['FAILED', 'PENDING'],
    ['RETRYING', 'PROCESSING'],
    ['RETRYING', 'PENDING'],
  ];

  it.each(valid)('allows %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(describeTransition(from, to)).toBeDefined();
  });

  it('rejects every transition not explicitly listed', () => {
    const isValid = (from: TaskStatus, to: TaskStatus) =>
      valid.some(([f, t]) => f === from && t === to);

    for (const from of TASK_STATUSES) {
      for (const to of TASK_STATUSES) {
        if (!isValid(from, to)) {
          expect(canTransition(from, to), `${from} → ${to}`).toBe(false);
        }
      }
    }
  });

  it('treats COMPLETED as terminal', () => {
    expect(allowedTransitions('COMPLETED')).toEqual([]);
  });

  it('does not allow skipping processing', () => {
    expect(canTransition('PENDING', 'COMPLETED')).toBe(false);
    expect(canTransition('PENDING', 'FAILED')).toBe(false);
    expect(canTransition('FAILED', 'COMPLETED')).toBe(false);
  });
});
