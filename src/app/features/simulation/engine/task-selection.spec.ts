import { Task, TaskPriority } from '../../tasks/models/task.model';
import { selectNextTasks } from './task-selection';

const task = (sequence: number, priority: TaskPriority): Task => ({
  id: `TASK-${sequence}`,
  sequence,
  title: `Task ${sequence}`,
  priority,
  status: 'PENDING',
  durationMs: 1000,
  failureProbability: 0,
  attempts: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('selectNextTasks', () => {
  it('orders by priority, highest first', () => {
    const picked = selectNextTasks([task(1, 'LOW'), task(2, 'HIGH'), task(3, 'MEDIUM')], 3);

    expect(picked.map((t) => t.priority)).toEqual(['HIGH', 'MEDIUM', 'LOW']);
  });

  it('uses FIFO within the same priority', () => {
    const picked = selectNextTasks([task(3, 'HIGH'), task(1, 'HIGH'), task(2, 'HIGH')], 3);

    expect(picked.map((t) => t.sequence)).toEqual([1, 2, 3]);
  });

  it('returns at most the number of free slots', () => {
    const candidates = [task(1, 'LOW'), task(2, 'LOW'), task(3, 'LOW')];

    expect(selectNextTasks(candidates, 2)).toHaveLength(2);
    expect(selectNextTasks(candidates, 0)).toEqual([]);
  });

  it('does not mutate the input', () => {
    const candidates = [task(2, 'LOW'), task(1, 'HIGH')];

    selectNextTasks(candidates, 2);

    expect(candidates.map((t) => t.sequence)).toEqual([2, 1]);
  });
});
