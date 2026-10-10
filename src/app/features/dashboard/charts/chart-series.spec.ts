import { Task } from '../../tasks/models/task.model';
import { TaskEvent, TaskEventType } from '../../tasks/models/task-event.model';
import { buildThroughput, buildTimeSeries } from './chart-series';

const NOW = Date.UTC(2026, 0, 1, 12, 0, 5); // 5s into the current 10s bucket
let id = 0;

const event = (type: TaskEventType, at: number): TaskEvent => ({
  id: `EVT-${++id}`,
  taskId: 'TASK-001',
  type,
  timestamp: new Date(at).toISOString(),
  fromStatus: null,
  toStatus: null,
  attempt: 1,
  message: '',
});

const completedTask = (start: number, end: number): Task => ({
  id: `TASK-${++id}`,
  sequence: id,
  title: 'Tarefa',
  priority: 'MEDIUM',
  status: 'COMPLETED',
  durationMs: end - start,
  failureProbability: 0,
  attempts: 1,
  createdAt: new Date(start).toISOString(),
  startedAt: new Date(start).toISOString(),
  completedAt: new Date(end).toISOString(),
});

describe('buildTimeSeries', () => {
  it('creates aligned buckets ending with the current one', () => {
    const series = buildTimeSeries([], [], NOW, 10_000, 3);

    expect(series.bucketStarts).toEqual([
      Date.UTC(2026, 0, 1, 11, 59, 40),
      Date.UTC(2026, 0, 1, 11, 59, 50),
      Date.UTC(2026, 0, 1, 12, 0, 0),
    ]);
    expect(series.successes).toEqual([0, 0, 0]);
    expect(series.averageProcessingMs).toEqual([null, null, null]);
  });

  it('counts successes and failed attempts per bucket', () => {
    const events = [
      event('COMPLETED', NOW - 21_000), // bucket 0
      event('FAILED', NOW - 12_000), // bucket 1
      event('FAILED', NOW - 11_000), // bucket 1
      event('COMPLETED', NOW - 1_000), // bucket 2
      event('STARTED', NOW - 1_000), // ignored
    ];

    const series = buildTimeSeries(events, [], NOW, 10_000, 3);

    expect(series.successes).toEqual([1, 0, 1]);
    expect(series.failures).toEqual([0, 2, 0]);
  });

  it('accumulates completions including those before the window', () => {
    const events = [
      event('COMPLETED', NOW - 120_000), // before the window
      event('COMPLETED', NOW - 21_000),
      event('COMPLETED', NOW - 1_000),
    ];

    const series = buildTimeSeries(events, [], NOW, 10_000, 3);

    expect(series.completedCumulative).toEqual([2, 2, 3]);
  });

  it('averages processing time of tasks completed in each bucket', () => {
    const tasks = [
      completedTask(NOW - 3_000, NOW - 2_000), // 1000ms, bucket 2
      completedTask(NOW - 5_000, NOW - 2_000), // 3000ms, bucket 2
      completedTask(NOW - 20_000, NOW - 15_000), // 5000ms, bucket 1
    ];

    const series = buildTimeSeries([], tasks, NOW, 10_000, 3);

    expect(series.averageProcessingMs).toEqual([null, 5000, 2000]);
  });
});

describe('buildThroughput', () => {
  it('counts completions per minute for the last minutes', () => {
    const events = [
      event('COMPLETED', NOW - 1_000),
      event('COMPLETED', NOW - 2_000),
      event('COMPLETED', NOW - 70_000), // 11:58:55 → first minute
      event('COMPLETED', NOW - 10 * 60_000), // outside the window
      event('FAILED', NOW - 1_000),
    ];

    const series = buildThroughput(events, NOW, 3);

    expect(series.completions).toEqual([1, 0, 2]);
    expect(series.bucketStarts.at(-1)).toBe(Date.UTC(2026, 0, 1, 12, 0, 0));
  });
});
