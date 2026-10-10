import { TestBed } from '@angular/core/testing';

import { createSeededGenerator } from '../../../core/utils/random';
import { TaskStore } from '../../tasks/store/task.store';
import { ProcessingEngineService } from '../engine/processing-engine.service';
import { DEMO_TASK_COUNT, DemoScenarioService } from './demo-scenario.service';

describe('DemoScenarioService', () => {
  it('builds varied tasks within the form limits', () => {
    const tasks = DemoScenarioService.buildTasks(createSeededGenerator(1));

    expect(tasks).toHaveLength(DEMO_TASK_COUNT);
    expect(new Set(tasks.map((t) => t.priority)).size).toBeGreaterThan(1);
    for (const task of tasks) {
      expect(task.durationMs).toBeGreaterThanOrEqual(1000);
      expect(task.durationMs).toBeLessThanOrEqual(8000);
      expect(task.failureProbability).toBeGreaterThanOrEqual(0);
      expect(task.failureProbability).toBeLessThanOrEqual(0.7);
    }
  });

  it('generates the same scenario for the same seed', () => {
    const a = DemoScenarioService.buildTasks(createSeededGenerator(42));
    const b = DemoScenarioService.buildTasks(createSeededGenerator(42));
    const c = DemoScenarioService.buildTasks(createSeededGenerator(43));

    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('replaces the queue and reproduces the whole run with a seed', () => {
    vi.useFakeTimers();
    try {
      const demo = TestBed.inject(DemoScenarioService);
      const store = TestBed.inject(TaskStore);
      const engine = TestBed.inject(ProcessingEngineService);
      const run = () => {
        demo.generate(42);
        engine.start();
        vi.advanceTimersByTime(120_000);
        return store.tasks().map((t) => [t.id, t.status, t.attempts]);
      };

      store.create({ title: 'Antiga', priority: 'LOW', durationMs: 1000, failureProbability: 0 });
      const first = run();
      const second = run();

      expect(first).toHaveLength(DEMO_TASK_COUNT);
      expect(first[0][0]).toBe('TASK-001');
      expect(second).toEqual(first);
    } finally {
      vi.useRealTimers();
    }
  });
});
