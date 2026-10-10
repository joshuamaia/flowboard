import { Task, TaskStatus } from '../../tasks/models/task.model';
import { computeMetrics } from './compute-metrics';

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);
let sequence = 0;

const task = (status: TaskStatus, extra: Partial<Task> = {}): Task => ({
  id: `TASK-${++sequence}`,
  sequence,
  title: 'Tarefa',
  priority: 'MEDIUM',
  status,
  durationMs: 1000,
  failureProbability: 0,
  attempts: 1,
  createdAt: new Date(NOW - 600_000).toISOString(),
  ...extra,
});

/** A completed task whose last attempt took `ms` and ended `agoMs` before NOW. */
const completed = (ms: number, agoMs: number) =>
  task('COMPLETED', {
    startedAt: new Date(NOW - agoMs - ms).toISOString(),
    completedAt: new Date(NOW - agoMs).toISOString(),
  });

describe('computeMetrics', () => {
  it('returns empty metrics without tasks', () => {
    expect(computeMetrics([], NOW)).toEqual({
      total: 0,
      pending: 0,
      processing: 0,
      retrying: 0,
      completed: 0,
      failed: 0,
      successRate: null,
      averageProcessingMs: null,
      throughputPerMinute: 0,
    });
  });

  it('counts tasks per status', () => {
    const metrics = computeMetrics(
      [task('PENDING'), task('PENDING'), task('PROCESSING'), task('RETRYING'), task('FAILED')],
      NOW,
    );

    expect(metrics).toMatchObject({
      total: 5,
      pending: 2,
      processing: 1,
      retrying: 1,
      completed: 0,
      failed: 1,
    });
  });

  it('computes success rate over finished tasks only', () => {
    const metrics = computeMetrics(
      [completed(1000, 0), completed(1000, 0), completed(1000, 0), task('FAILED'), task('PENDING')],
      NOW,
    );

    expect(metrics.successRate).toBe(0.75);
  });

  it('averages the processing time of completed tasks', () => {
    const metrics = computeMetrics([completed(1000, 0), completed(3000, 0)], NOW);

    expect(metrics.averageProcessingMs).toBe(2000);
  });

  it('counts only completions in the last minute as throughput', () => {
    const metrics = computeMetrics(
      [completed(500, 1_000), completed(500, 59_000), completed(500, 61_000)],
      NOW,
    );

    expect(metrics.throughputPerMinute).toBe(2);
  });
});
