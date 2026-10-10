import { TestBed } from '@angular/core/testing';

import { SequenceRandom } from '../../../../testing/sequence-random';
import { RandomSource } from '../../../core/utils/random';
import { NewTaskInput, TaskStatus } from '../../tasks/models/task.model';
import { EventLogStore } from '../../tasks/store/event-log.store';
import { TaskStore } from '../../tasks/store/task.store';
import { SimulationSettings } from '../models/simulation-settings.model';
import { SimulationSettingsStore } from '../services/simulation-settings.store';
import { ProcessingEngineService } from './processing-engine.service';

const SUCCESS = 0.99;
const FAIL = 0;

describe('ProcessingEngineService', () => {
  let engine: ProcessingEngineService;
  let store: TaskStore;
  let events: EventLogStore;
  let settings: SimulationSettingsStore;

  const setup = (rolls: number[], overrides: Partial<SimulationSettings> = {}) => {
    TestBed.configureTestingModule({
      providers: [{ provide: RandomSource, useValue: new SequenceRandom(rolls) }],
    });
    engine = TestBed.inject(ProcessingEngineService);
    store = TestBed.inject(TaskStore);
    events = TestBed.inject(EventLogStore);
    settings = TestBed.inject(SimulationSettingsStore);
    settings.update({
      maxConcurrency: 2,
      maxRetries: 0,
      retryStrategy: 'FIXED',
      initialRetryDelayMs: 1000,
      maxRetryDelayMs: 8000,
      speed: 1,
      ...overrides,
    });
  };

  const create = (overrides: Partial<NewTaskInput> = {}) =>
    store.create({
      title: 'Tarefa',
      priority: 'MEDIUM',
      durationMs: 1000,
      failureProbability: 0.5,
      ...overrides,
    });

  const statusOf = (id: string): TaskStatus | undefined => store.getById(id)?.status;
  const eventTypes = (id: string) =>
    events
      .events()
      .filter((event) => event.taskId === id)
      .map((event) => event.type);

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('dispatch', () => {
    it('does nothing until started', () => {
      setup([SUCCESS]);
      const task = create();

      vi.advanceTimersByTime(5000);

      expect(statusOf(task.id)).toBe('PENDING');
      expect(engine.status()).toBe('IDLE');
    });

    it('respects the concurrency limit', () => {
      setup([SUCCESS], { maxConcurrency: 2 });
      const tasks = [create(), create(), create(), create()];

      engine.start();

      expect(tasks.map((t) => statusOf(t.id))).toEqual([
        'PROCESSING',
        'PROCESSING',
        'PENDING',
        'PENDING',
      ]);
      expect(engine.activeCount()).toBe(2);
    });

    it('picks the highest priority first', () => {
      setup([SUCCESS], { maxConcurrency: 1 });
      const low = create({ priority: 'LOW' });
      const high = create({ priority: 'HIGH' });
      const medium = create({ priority: 'MEDIUM' });

      engine.start();
      expect(statusOf(high.id)).toBe('PROCESSING');

      vi.advanceTimersByTime(1000);
      expect(statusOf(medium.id)).toBe('PROCESSING');

      vi.advanceTimersByTime(1000);
      expect(statusOf(low.id)).toBe('PROCESSING');
    });

    it('uses FIFO within the same priority', () => {
      setup([SUCCESS], { maxConcurrency: 1 });
      const first = create();
      const second = create();

      engine.start();

      expect(statusOf(first.id)).toBe('PROCESSING');
      expect(statusOf(second.id)).toBe('PENDING');
    });

    it('picks up tasks created while running', () => {
      setup([SUCCESS]);
      engine.start();

      const task = create();
      TestBed.tick();

      expect(statusOf(task.id)).toBe('PROCESSING');
    });

    it('frees the slot when a task finishes', () => {
      setup([SUCCESS], { maxConcurrency: 1 });
      const first = create({ durationMs: 2000 });
      const second = create();

      engine.start();
      vi.advanceTimersByTime(1999);
      expect(statusOf(second.id)).toBe('PENDING');

      vi.advanceTimersByTime(1);
      expect(statusOf(first.id)).toBe('COMPLETED');
      expect(statusOf(second.id)).toBe('PROCESSING');
    });
  });

  describe('attempt outcome', () => {
    it('completes a task after its duration and records start/end', () => {
      setup([SUCCESS]);
      const task = create({ durationMs: 3000 });
      const start = Date.now();

      engine.start();
      vi.advanceTimersByTime(3000);

      expect(store.getById(task.id)).toMatchObject({
        status: 'COMPLETED',
        attempts: 1,
        startedAt: new Date(start).toISOString(),
        completedAt: new Date(start + 3000).toISOString(),
      });
      expect(eventTypes(task.id)).toEqual(['CREATED', 'STARTED', 'COMPLETED']);
      expect(engine.executions()).toEqual([]);
    });

    it('fails when the roll is below the failure probability', () => {
      setup([0.3], { maxRetries: 0 });
      const task = create({ failureProbability: 0.4 });

      engine.start();
      vi.advanceTimersByTime(1000);

      expect(statusOf(task.id)).toBe('FAILED');
      expect(events.events().at(-1)?.message).toContain('Limite de tentativas atingido');
    });

    it('succeeds when the roll is at or above the failure probability', () => {
      setup([0.4]);
      const task = create({ failureProbability: 0.4 });

      engine.start();
      vi.advanceTimersByTime(1000);

      expect(statusOf(task.id)).toBe('COMPLETED');
    });

    it('leaves an exhausted task in FAILED and keeps processing others', () => {
      setup([FAIL, SUCCESS], { maxConcurrency: 1, maxRetries: 0 });
      const failing = create();
      const next = create();

      engine.start();
      vi.advanceTimersByTime(1000);
      expect(statusOf(failing.id)).toBe('FAILED');
      expect(statusOf(next.id)).toBe('PROCESSING');

      vi.advanceTimersByTime(60_000);
      expect(statusOf(failing.id)).toBe('FAILED');
    });
  });

  describe('retry', () => {
    it('retries after the configured delay and eventually completes', () => {
      setup([FAIL, SUCCESS], { maxRetries: 2, initialRetryDelayMs: 1000 });
      const task = create();

      engine.start();
      vi.advanceTimersByTime(1000);
      expect(statusOf(task.id)).toBe('RETRYING');

      vi.advanceTimersByTime(999);
      expect(statusOf(task.id)).toBe('RETRYING');

      vi.advanceTimersByTime(1);
      expect(store.getById(task.id)).toMatchObject({ status: 'PROCESSING', attempts: 2 });

      vi.advanceTimersByTime(1000);
      expect(statusOf(task.id)).toBe('COMPLETED');
      expect(eventTypes(task.id)).toEqual([
        'CREATED',
        'STARTED',
        'FAILED',
        'RETRY_SCHEDULED',
        'RETRY_STARTED',
        'COMPLETED',
      ]);
    });

    it('stops retrying after maxRetries', () => {
      setup([FAIL], { maxRetries: 2, initialRetryDelayMs: 500 });
      const task = create();

      engine.start();
      vi.advanceTimersByTime(1000 + 500 + 1000 + 500 + 1000);

      expect(store.getById(task.id)).toMatchObject({ status: 'FAILED', attempts: 3 });
      vi.advanceTimersByTime(60_000);
      expect(store.getById(task.id)?.attempts).toBe(3);
    });

    it('waits with exponential backoff between attempts', () => {
      setup([FAIL], {
        maxRetries: 3,
        retryStrategy: 'EXPONENTIAL',
        initialRetryDelayMs: 1000,
        maxRetryDelayMs: 3000,
      });
      const task = create({ durationMs: 100 });
      const startTimes: number[] = [];
      const recordStart = () => {
        if (
          statusOf(task.id) === 'PROCESSING' &&
          startTimes.length < store.getById(task.id)!.attempts
        ) {
          startTimes.push(Date.now());
        }
      };

      const t0 = Date.now();
      engine.start();
      recordStart();
      for (let i = 0; i < 8000; i += 50) {
        vi.advanceTimersByTime(50);
        recordStart();
      }

      // attempt end (100ms) + backoff: 1000, 2000, then capped at 3000
      expect(startTimes.map((t) => t - t0)).toEqual([0, 1100, 3200, 6300]);
    });

    it('does not use a worker slot while waiting for a retry', () => {
      setup([FAIL, SUCCESS], { maxConcurrency: 1, maxRetries: 1, initialRetryDelayMs: 5000 });
      const failing = create();
      const other = create();

      engine.start();
      vi.advanceTimersByTime(1000);

      expect(statusOf(failing.id)).toBe('RETRYING');
      expect(statusOf(other.id)).toBe('PROCESSING');
    });
  });

  describe('pause and resume', () => {
    it('preserves the remaining time of running tasks', () => {
      setup([SUCCESS]);
      const task = create({ durationMs: 3000 });

      engine.start();
      vi.advanceTimersByTime(1000);
      engine.pause();
      expect(engine.status()).toBe('PAUSED');

      vi.advanceTimersByTime(10_000);
      expect(statusOf(task.id)).toBe('PROCESSING');
      expect(engine.executionOf(task.id)?.remainingMs).toBe(2000);

      engine.resume();
      vi.advanceTimersByTime(1999);
      expect(statusOf(task.id)).toBe('PROCESSING');

      vi.advanceTimersByTime(1);
      expect(statusOf(task.id)).toBe('COMPLETED');
    });

    it('preserves the remaining retry delay', () => {
      setup([FAIL, SUCCESS], { maxRetries: 1, initialRetryDelayMs: 2000 });
      const task = create();

      engine.start();
      vi.advanceTimersByTime(1000 + 500);
      engine.pause();
      vi.advanceTimersByTime(10_000);
      expect(statusOf(task.id)).toBe('RETRYING');

      engine.resume();
      vi.advanceTimersByTime(1500);
      expect(statusOf(task.id)).toBe('PROCESSING');
    });

    it('does not dispatch new tasks while paused', () => {
      setup([SUCCESS]);
      engine.start();
      engine.pause();

      const task = create();
      TestBed.tick();
      vi.advanceTimersByTime(5000);
      expect(statusOf(task.id)).toBe('PENDING');

      engine.resume();
      expect(statusOf(task.id)).toBe('PROCESSING');
    });
  });

  describe('stop', () => {
    it('returns in-flight tasks to PENDING and cancels timers', () => {
      setup([FAIL, SUCCESS], { maxConcurrency: 2, maxRetries: 1, initialRetryDelayMs: 5000 });
      const retrying = create({ durationMs: 500 });
      const processing = create({ durationMs: 3000 });
      const done = create({ durationMs: 100 });

      engine.start();
      vi.advanceTimersByTime(500);
      expect(statusOf(retrying.id)).toBe('RETRYING');
      vi.advanceTimersByTime(100);
      expect(statusOf(done.id)).toBe('COMPLETED');

      const interrupted = engine.stop();

      expect(interrupted).toBe(2);
      expect(engine.status()).toBe('IDLE');
      expect(statusOf(retrying.id)).toBe('PENDING');
      expect(statusOf(processing.id)).toBe('PENDING');
      expect(statusOf(done.id)).toBe('COMPLETED');
      expect(eventTypes(processing.id).at(-1)).toBe('INTERRUPTED');
      expect(eventTypes(retrying.id).at(-1)).toBe('INTERRUPTED');
      expect(engine.executions()).toEqual([]);

      vi.advanceTimersByTime(60_000);
      expect(statusOf(processing.id)).toBe('PENDING');
      expect(vi.getTimerCount()).toBe(0);
    });

    it('can be stopped while paused and started again', () => {
      setup([SUCCESS]);
      const task = create();

      engine.start();
      engine.pause();
      engine.stop();
      expect(statusOf(task.id)).toBe('PENDING');

      engine.start();
      vi.advanceTimersByTime(1000);
      expect(statusOf(task.id)).toBe('COMPLETED');
    });
  });

  describe('manual intervention', () => {
    it('interrupts a single processing task and frees its slot', () => {
      setup([SUCCESS], { maxConcurrency: 1 });
      const first = create({ priority: 'HIGH' });
      const second = create();

      engine.start();
      engine.pause();
      expect(engine.interrupt(first.id)).toBe(true);

      expect(statusOf(first.id)).toBe('PENDING');
      expect(store.getById(first.id)?.startedAt).toBeUndefined();
      expect(engine.executionOf(first.id)).toBeUndefined();
      expect(events.events().at(-1)).toMatchObject({
        type: 'INTERRUPTED',
        message: `${first.id} interrompida manualmente e devolvida à fila.`,
      });
      expect(engine.activeCount()).toBe(0);
      expect(statusOf(second.id)).toBe('PENDING');
    });

    it('interrupts a task waiting for retry', () => {
      setup([FAIL], { maxRetries: 1, initialRetryDelayMs: 5000 });
      const task = create();

      engine.start();
      vi.advanceTimersByTime(1000);
      expect(statusOf(task.id)).toBe('RETRYING');

      expect(engine.interrupt(task.id)).toBe(true);
      expect(statusOf(task.id)).toBe('PENDING');
    });

    it('does not interrupt idle tasks', () => {
      setup([SUCCESS]);
      const task = create();

      expect(engine.interrupt(task.id)).toBe(false);
    });

    it('requeues an exhausted task with a fresh retry budget', () => {
      setup([FAIL, SUCCESS], { maxRetries: 0 });
      const task = create();

      engine.start();
      vi.advanceTimersByTime(1000);
      expect(statusOf(task.id)).toBe('FAILED');

      expect(engine.requeue(task.id)).toBe(true);
      expect(store.getById(task.id)).toMatchObject({ attempts: 0 });
      expect(eventTypes(task.id).at(-1)).toBe('REQUEUED');

      TestBed.tick();
      expect(store.getById(task.id)).toMatchObject({ status: 'PROCESSING', attempts: 1 });
      vi.advanceTimersByTime(1000);
      expect(statusOf(task.id)).toBe('COMPLETED');
    });

    it('refuses to requeue tasks that are not failed', () => {
      setup([SUCCESS]);
      const task = create();

      expect(engine.requeue(task.id)).toBe(false);
    });
  });

  describe('speed', () => {
    it('runs faster with a higher speed multiplier', () => {
      setup([SUCCESS], { speed: 2 });
      const task = create({ durationMs: 3000 });

      engine.start();
      vi.advanceTimersByTime(1500);

      expect(statusOf(task.id)).toBe('COMPLETED');
    });

    it('re-times running tasks when the speed changes', () => {
      setup([SUCCESS], { speed: 1 });
      const task = create({ durationMs: 4000 });

      engine.start();
      vi.advanceTimersByTime(2000); // 2000 simulated ms left
      settings.update({ speed: 4 });
      TestBed.tick();

      vi.advanceTimersByTime(499);
      expect(statusOf(task.id)).toBe('PROCESSING');
      vi.advanceTimersByTime(1);
      expect(statusOf(task.id)).toBe('COMPLETED');
    });
  });
});
