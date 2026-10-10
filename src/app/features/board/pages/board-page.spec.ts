import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SequenceRandom } from '../../../../testing/sequence-random';
import { RandomSource } from '../../../core/utils/random';
import { ProcessingEngineService } from '../../simulation/engine/processing-engine.service';
import { SimulationSettingsStore } from '../../simulation/services/simulation-settings.store';
import { NewTaskInput } from '../../tasks/models/task.model';
import { TaskStore } from '../../tasks/store/task.store';
import { BoardPage } from './board-page';

describe('BoardPage', () => {
  let fixture: ComponentFixture<BoardPage>;
  let element: HTMLElement;
  let store: TaskStore;
  let engine: ProcessingEngineService;

  const create = (overrides: Partial<NewTaskInput> = {}) =>
    store.create({
      title: 'Tarefa',
      priority: 'MEDIUM',
      durationMs: 1000,
      failureProbability: 0.5,
      ...overrides,
    });

  const columnIds = (column: string) =>
    Array.from(
      element.querySelectorAll(`app-board-column[data-column="${column}"] app-task-card .id`),
      (node) => node.textContent?.trim(),
    );

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: RandomSource, useValue: new SequenceRandom([0]) }],
    });
    store = TestBed.inject(TaskStore);
    engine = TestBed.inject(ProcessingEngineService);
    TestBed.inject(SimulationSettingsStore).update({ maxConcurrency: 1, maxRetries: 0 });
    fixture = TestBed.createComponent(BoardPage);
    element = fixture.nativeElement as HTMLElement;
  });

  /** Synchronous render: whenStable() would wait on faked scheduler timers. */
  const render = () => {
    TestBed.tick();
    fixture.detectChanges();
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the empty state without tasks', async () => {
    render();

    expect(element.querySelector('app-empty-state')).not.toBeNull();
    expect(element.querySelectorAll('app-board-column')).toHaveLength(0);
  });

  it('distributes tasks in columns, pending in dispatch order', async () => {
    create({ priority: 'LOW' });
    create({ priority: 'HIGH' });
    create({ priority: 'MEDIUM' });
    render();

    expect(columnIds('pending')).toEqual(['TASK-002', 'TASK-003', 'TASK-001']);

    engine.start();
    render();
    expect(columnIds('processing')).toEqual(['TASK-002']);
    expect(columnIds('pending')).toEqual(['TASK-003', 'TASK-001']);

    vi.advanceTimersByTime(1000);
    render();
    expect(columnIds('failed')).toEqual(['TASK-002']);
  });

  it('requeues a failed task from the card action', async () => {
    const task = create();
    engine.start();
    vi.advanceTimersByTime(1000);
    engine.pause();
    render();
    expect(columnIds('failed')).toEqual([task.id]);

    element
      .querySelector<HTMLButtonElement>(`[aria-label="Reenviar ${task.id} para a fila"]`)!
      .click();
    render();

    expect(columnIds('pending')).toEqual([task.id]);
    expect(columnIds('failed')).toEqual([]);
  });
});
