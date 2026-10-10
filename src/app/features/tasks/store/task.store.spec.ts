import { TestBed } from '@angular/core/testing';

import { FakeClock } from '../../../../testing/fake-clock';
import { Clock } from '../../../core/utils/clock';
import { NewTaskInput } from '../models/task.model';
import { EventLogStore } from './event-log.store';
import { TaskStore } from './task.store';

const input = (overrides: Partial<NewTaskInput> = {}): NewTaskInput => ({
  title: 'Gerar relatório',
  priority: 'MEDIUM',
  durationMs: 3000,
  failureProbability: 0.2,
  ...overrides,
});

describe('TaskStore', () => {
  let store: TaskStore;
  let events: EventLogStore;
  let clock: FakeClock;

  beforeEach(() => {
    clock = new FakeClock();
    TestBed.configureTestingModule({ providers: [{ provide: Clock, useValue: clock }] });
    store = TestBed.inject(TaskStore);
    events = TestBed.inject(EventLogStore);
  });

  describe('create', () => {
    it('creates a PENDING task with sequential id and clock timestamp', () => {
      const task = store.create(input());

      expect(task).toEqual({
        id: 'TASK-001',
        sequence: 1,
        title: 'Gerar relatório',
        priority: 'MEDIUM',
        status: 'PENDING',
        durationMs: 3000,
        failureProbability: 0.2,
        attempts: 0,
        createdAt: new Date(clock.now()).toISOString(),
      });
      expect(store.tasks()).toEqual([task]);
    });

    it('increments ids and keeps creation order', () => {
      store.create(input());
      clock.advance(1000);
      const second = store.create(input({ title: 'Outra' }));

      expect(second.id).toBe('TASK-002');
      expect(second.sequence).toBe(2);
      expect(store.tasks().map((t) => t.id)).toEqual(['TASK-001', 'TASK-002']);
    });

    it('trims title and drops blank descriptions', () => {
      const task = store.create(input({ title: '  Título  ', description: '   ' }));

      expect(task.title).toBe('Título');
      expect(task).not.toHaveProperty('description');
    });

    it('records a CREATED event', () => {
      store.create(input());

      expect(events.events()).toEqual([
        expect.objectContaining({
          taskId: 'TASK-001',
          type: 'CREATED',
          fromStatus: null,
          toStatus: 'PENDING',
          attempt: 0,
          message: 'TASK-001 criada.',
        }),
      ]);
    });
  });

  describe('transition', () => {
    it('applies a valid transition with patch and records the event', () => {
      const task = store.create(input());
      const startedAt = new Date(clock.now()).toISOString();

      const result = store.transition(task.id, 'PROCESSING', {
        patch: { attempts: 1, startedAt },
      });

      expect(result.ok).toBe(true);
      expect(store.getById(task.id)).toMatchObject({
        status: 'PROCESSING',
        attempts: 1,
        startedAt,
      });
      expect(events.events().at(-1)).toMatchObject({
        type: 'STARTED',
        fromStatus: 'PENDING',
        toStatus: 'PROCESSING',
        attempt: 1,
        message: 'TASK-001 iniciou processamento.',
      });
    });

    it('rejects an invalid transition without changing state or logging', () => {
      const task = store.create(input());
      const before = store.tasks();

      const result = store.transition(task.id, 'COMPLETED');

      expect(result).toEqual({
        ok: false,
        error: 'Transição inválida: Pendente → Concluída.',
      });
      expect(store.tasks()).toBe(before);
      expect(events.events()).toHaveLength(1);
    });

    it('fails for an unknown task', () => {
      expect(store.transition('TASK-999', 'PROCESSING').ok).toBe(false);
    });

    it('allows overriding the event description', () => {
      const task = store.create(input());
      store.transition(task.id, 'PROCESSING');

      store.transition(task.id, 'PENDING', {
        event: { type: 'INTERRUPTED', message: 'Simulação interrompida.' },
      });

      expect(events.events().at(-1)).toMatchObject({
        type: 'INTERRUPTED',
        message: 'Simulação interrompida.',
      });
    });
  });

  describe('state updates', () => {
    it('never mutates the previous array or task objects', () => {
      const task = store.create(input());
      const snapshot = store.tasks();

      store.transition(task.id, 'PROCESSING');

      expect(store.tasks()).not.toBe(snapshot);
      expect(snapshot[0].status).toBe('PENDING');
    });

    it('updates editable fields', () => {
      const task = store.create(input());

      store.update(task.id, { title: 'Novo título', priority: 'HIGH' });

      expect(store.getById(task.id)).toMatchObject({ title: 'Novo título', priority: 'HIGH' });
      expect(events.events().at(-1)?.type).toBe('UPDATED');
    });

    it('removes idle tasks and keeps their history', () => {
      const task = store.create(input());

      expect(store.remove(task.id)).toBe(true);

      expect(store.tasks()).toEqual([]);
      expect(events.events().map((e) => e.type)).toEqual(['CREATED', 'DELETED']);
    });

    it('refuses to remove a task owned by the engine', () => {
      const task = store.create(input());
      store.transition(task.id, 'PROCESSING');

      expect(store.remove(task.id)).toBe(false);
      expect(store.count()).toBe(1);
    });

    it('derives groups per status', () => {
      const a = store.create(input());
      store.create(input());
      store.transition(a.id, 'PROCESSING');

      expect(store.pending().map((t) => t.id)).toEqual(['TASK-002']);
      expect(store.processing().map((t) => t.id)).toEqual(['TASK-001']);
      expect(store.completed()).toEqual([]);
      expect(store.count()).toBe(2);
    });
  });
});
