import { TestBed } from '@angular/core/testing';

import { FakeClock } from '../../../testing/fake-clock';
import { MemoryStorage } from '../../../testing/memory-storage';
import { ProcessingEngineService } from '../../features/simulation/engine/processing-engine.service';
import { SimulationSettingsStore } from '../../features/simulation/services/simulation-settings.store';
import { NewTaskInput } from '../../features/tasks/models/task.model';
import { EventLogStore } from '../../features/tasks/store/event-log.store';
import { TaskStore } from '../../features/tasks/store/task.store';
import { ThemeService } from '../services/theme.service';
import { ToastService } from '../services/toast.service';
import { Clock } from '../utils/clock';
import { BROWSER_STORAGE } from './browser-storage';
import { STORAGE_KEY } from './persistence-snapshot.model';
import { PersistenceService } from './persistence.service';

const input: NewTaskInput = {
  title: 'Tarefa',
  priority: 'MEDIUM',
  durationMs: 1000,
  failureProbability: 0,
};

describe('PersistenceService', () => {
  let storage: MemoryStorage;
  let clock: FakeClock;

  /** Boots a fresh app injector against the same storage, like a page reload. */
  const boot = () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: BROWSER_STORAGE, useValue: storage },
        { provide: Clock, useValue: clock },
      ],
    });
    const persistence = TestBed.inject(PersistenceService);
    TestBed.tick();
    return {
      persistence,
      tasks: TestBed.inject(TaskStore),
      events: TestBed.inject(EventLogStore),
      settings: TestBed.inject(SimulationSettingsStore),
      theme: TestBed.inject(ThemeService),
      toast: TestBed.inject(ToastService),
    };
  };

  const saved = () => JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null');

  beforeEach(() => {
    storage = new MemoryStorage();
    clock = new FakeClock();
  });

  describe('saving', () => {
    it('coalesces rapid changes into a single write', () => {
      vi.useFakeTimers();
      try {
        const app = boot();
        const setItem = vi.spyOn(storage, 'setItem');

        for (let i = 0; i < 5; i++) {
          app.tasks.create(input);
          TestBed.tick();
        }
        expect(setItem).not.toHaveBeenCalled();

        vi.advanceTimersByTime(300);
        expect(setItem).toHaveBeenCalledTimes(1);
        expect(saved().tasks).toHaveLength(5);
      } finally {
        vi.useRealTimers();
      }
    });

    it('flushes pending changes when the page is hidden', () => {
      const app = boot();
      app.tasks.create(input);
      TestBed.tick();

      window.dispatchEvent(new Event('pagehide'));

      expect(saved().tasks).toHaveLength(1);
    });

    it('writes a versioned snapshot when state changes', () => {
      const app = boot();

      app.tasks.create(input);
      app.settings.update({ maxConcurrency: 5 });
      app.theme.setTheme('light');
      TestBed.tick();
      app.persistence.flush();

      expect(saved()).toMatchObject({
        version: 1,
        tasks: [{ id: 'TASK-001', status: 'PENDING' }],
        events: [{ type: 'CREATED' }],
        nextTaskSequence: 2,
        settings: { maxConcurrency: 5 },
        theme: 'light',
      });
    });

    it('keeps working and warns once when storage writes fail', () => {
      const app = boot();
      const errorSpy = vi.spyOn(app.toast, 'error');
      storage.failWrites = true;

      app.tasks.create(input);
      TestBed.tick();
      app.persistence.flush();
      app.tasks.create(input);
      TestBed.tick();
      app.persistence.flush();

      expect(app.tasks.count()).toBe(2);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('works without storage at all', () => {
      TestBed.configureTestingModule({ providers: [{ provide: BROWSER_STORAGE, useValue: null }] });
      const persistence = TestBed.inject(PersistenceService);
      TestBed.inject(TaskStore).create(input);
      TestBed.tick();

      expect(persistence.available).toBe(false);
      expect(persistence.restored).toBeNull();
    });
  });

  describe('recovery after reload', () => {
    it('restores tasks, history, settings and theme', () => {
      const first = boot();
      first.tasks.create(input);
      first.tasks.create({ ...input, title: 'Segunda' });
      first.settings.update({ maxRetries: 7 });
      first.theme.setTheme('light');
      TestBed.tick();

      const second = boot();

      expect(second.tasks.tasks().map((t) => t.title)).toEqual(['Tarefa', 'Segunda']);
      expect(second.events.events()).toHaveLength(2);
      expect(second.settings.settings().maxRetries).toBe(7);
      expect(second.theme.theme()).toBe('light');
      expect(second.persistence.restored).toEqual({ tasks: 2, recovered: 0 });
    });

    it('continues ids after reload instead of reusing them', () => {
      const first = boot();
      first.tasks.create(input);
      TestBed.tick();

      const second = boot();
      const created = second.tasks.create(input);

      expect(created.id).toBe('TASK-002');
      expect(second.events.events().at(-1)?.id).toBe('EVT-2');
    });

    it('normalizes in-flight tasks to PENDING and records a RECOVERED event', () => {
      vi.useFakeTimers();
      try {
        const first = boot();
        const engine = TestBed.inject(ProcessingEngineService);
        first.settings.update({ maxConcurrency: 2, maxRetries: 1, initialRetryDelayMs: 5000 });
        first.tasks.create({ ...input, durationMs: 5000 });
        first.tasks.create({ ...input, failureProbability: 1, durationMs: 500 });
        engine.start();
        vi.advanceTimersByTime(500); // second task fails → RETRYING
        TestBed.tick();
        expect(first.tasks.tasks().map((t) => t.status)).toEqual(['PROCESSING', 'RETRYING']);

        const second = boot();
        const reloadedEngine = TestBed.inject(ProcessingEngineService);

        expect(second.tasks.tasks().map((t) => t.status)).toEqual(['PENDING', 'PENDING']);
        expect(second.tasks.tasks()[0].startedAt).toBeUndefined();
        expect(
          second.events
            .events()
            .filter((e) => e.type === 'RECOVERED')
            .map((e) => e.taskId),
        ).toEqual(['TASK-001', 'TASK-002']);
        expect(second.persistence.restored).toEqual({ tasks: 2, recovered: 2 });

        // Old timers are not resumed: nothing runs until the user starts again.
        expect(reloadedEngine.status()).toBe('IDLE');
        vi.advanceTimersByTime(60_000);
        expect(second.tasks.tasks().map((t) => t.status)).toEqual(['PENDING', 'PENDING']);
      } finally {
        vi.useRealTimers();
      }
    });

    it('ignores corrupted data without crashing', () => {
      storage.setItem(STORAGE_KEY, '{not json');

      const app = boot();

      expect(app.tasks.count()).toBe(0);
      expect(app.persistence.restored).toBeNull();
      expect(app.toast.toasts().at(-1)?.kind).toBe('error');
    });

    it('ignores snapshots from an unsupported (newer) version', () => {
      storage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, tasks: [], events: [] }));

      expect(boot().persistence.restored).toBeNull();
    });
  });

  it('clears the persisted snapshot', () => {
    const app = boot();
    app.tasks.create(input);
    TestBed.tick();
    app.persistence.flush();
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();

    app.persistence.clearStorage();

    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });
});
