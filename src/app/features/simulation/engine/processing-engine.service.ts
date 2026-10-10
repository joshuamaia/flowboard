import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { Subscription, timer } from 'rxjs';

import { Clock } from '../../../core/utils/clock';
import { RandomSource } from '../../../core/utils/random';
import { formatDuration } from '../../../shared/pipes/duration.pipe';
import { Task } from '../../tasks/models/task.model';
import { TaskStore } from '../../tasks/store/task.store';
import { Execution, SimulationStatus } from '../models/simulation-status.model';
import { SimulationSettingsStore } from '../services/simulation-settings.store';
import { canRetry, retryDelayMs } from './retry-policy';
import { selectNextTasks } from './task-selection';

/**
 * Simulated worker pool.
 *
 * Tasks are pulled from the queue by priority (FIFO within a priority) while
 * fewer than `maxConcurrency` attempts are running. Each attempt and each retry
 * delay is an RxJS timer, so pausing/stopping is just unsubscribing. Remaining
 * time is tracked in simulated milliseconds, which keeps pause and speed
 * changes exact.
 */
@Injectable({ providedIn: 'root' })
export class ProcessingEngineService {
  private readonly store = inject(TaskStore);
  private readonly settingsStore = inject(SimulationSettingsStore);
  private readonly clock = inject(Clock);
  private readonly random = inject(RandomSource);

  private readonly _status = signal<SimulationStatus>('IDLE');
  private readonly _executions = signal<ReadonlyMap<string, Execution>>(new Map());
  private readonly timers = new Map<string, Subscription>();

  readonly status = this._status.asReadonly();
  readonly executions = computed(() => [...this._executions().values()]);
  readonly activeCount = computed(
    () => this.executions().filter((execution) => execution.phase === 'PROCESSING').length,
  );
  readonly capacity = computed(() => this.settingsStore.settings().maxConcurrency);

  constructor() {
    // Pull new work whenever the queue, the capacity or the status changes.
    effect(() => {
      this.store.pending();
      this.capacity();
      this._status();
      untracked(() => this.dispatch());
    });

    // Re-time running timers when the simulation speed changes.
    let previousSpeed = this.settingsStore.settings().speed;
    effect(() => {
      const speed = this.settingsStore.settings().speed;
      untracked(() => {
        if (speed !== previousSpeed) {
          previousSpeed = speed;
          this.reschedule();
        }
      });
    });

    inject(DestroyRef).onDestroy(() => this.cancelTimers());
  }

  /** Runtime state of a task owned by the engine, if any. */
  executionOf(taskId: string): Execution | undefined {
    return this._executions().get(taskId);
  }

  start(): void {
    if (this._status() !== 'IDLE') {
      return;
    }
    this._status.set('RUNNING');
    this.dispatch();
  }

  /** Freezes every timer, keeping the remaining simulated time. */
  pause(): void {
    if (this._status() !== 'RUNNING') {
      return;
    }
    for (const execution of this.executions()) {
      this.freeze(execution.taskId);
    }
    this._status.set('PAUSED');
  }

  resume(): void {
    if (this._status() !== 'PAUSED') {
      return;
    }
    this._status.set('RUNNING');
    for (const execution of this.executions()) {
      if (execution.phase !== 'READY') {
        this.schedule(execution.taskId);
      }
    }
    this.dispatch();
  }

  /**
   * Cancels all timers and returns every in-flight task to the queue.
   * Returns how many tasks were interrupted.
   */
  stop(): number {
    if (this._status() === 'IDLE') {
      return 0;
    }

    this.cancelTimers();
    const executions = this.executions();
    this._executions.set(new Map());
    this._status.set('IDLE');

    for (const { taskId, phase } of executions) {
      this.store.transition(taskId, 'PENDING', {
        patch: { startedAt: undefined, completedAt: undefined },
        event: {
          type: 'INTERRUPTED',
          message:
            phase === 'PROCESSING'
              ? `${taskId} interrompida durante o processamento e devolvida à fila.`
              : `${taskId} teve o retry cancelado e foi devolvida à fila.`,
        },
      });
    }
    return executions.length;
  }

  /**
   * Manual intervention: cancels the in-flight work of one task and puts it
   * back in the queue, where it is picked again according to its priority.
   */
  interrupt(taskId: string): boolean {
    const task = this.store.getById(taskId);
    if (!task || (task.status !== 'PROCESSING' && task.status !== 'RETRYING')) {
      return false;
    }

    this.timers.get(taskId)?.unsubscribe();
    this.timers.delete(taskId);
    this.setExecution(taskId, null);
    return this.store.transition(taskId, 'PENDING', {
      patch: { startedAt: undefined, completedAt: undefined },
      event: {
        type: 'INTERRUPTED',
        message: `${taskId} interrompida manualmente e devolvida à fila.`,
      },
    }).ok;
  }

  /** Manual intervention: sends a failed task back to the queue with a fresh retry budget. */
  requeue(taskId: string): boolean {
    return this.store.transition(taskId, 'PENDING', {
      patch: { attempts: 0, startedAt: undefined, completedAt: undefined },
    }).ok;
  }

  /** Fills free worker slots: ready retries first, then pending tasks. */
  private dispatch(): void {
    if (this._status() !== 'RUNNING') {
      return;
    }

    let slots = this.capacity() - this.activeCount();
    const readyRetries = this.executions()
      .filter((execution) => execution.phase === 'READY')
      .map((execution) => this.store.getById(execution.taskId))
      .filter((task): task is Task => task !== undefined);

    for (const task of selectNextTasks(readyRetries, slots)) {
      this.beginAttempt(task);
      slots--;
    }
    for (const task of selectNextTasks(this.store.pending(), slots)) {
      this.beginAttempt(task);
    }
  }

  private beginAttempt(task: Task): void {
    const result = this.store.transition(task.id, 'PROCESSING', {
      patch: {
        attempts: task.attempts + 1,
        startedAt: this.isoNow(),
        completedAt: undefined,
      },
    });
    if (!result.ok) {
      this.setExecution(task.id, null);
      return;
    }

    this.setExecution(task.id, {
      taskId: task.id,
      phase: 'PROCESSING',
      remainingMs: task.durationMs,
      totalMs: task.durationMs,
      resumedAt: null,
      speed: this.speed(),
    });
    this.schedule(task.id);
  }

  private onTimerElapsed(taskId: string): void {
    this.timers.delete(taskId);
    const execution = this.executionOf(taskId);
    if (!execution) {
      return;
    }

    if (execution.phase === 'PROCESSING') {
      this.finishAttempt(taskId);
    } else if (execution.phase === 'BACKOFF') {
      this.setExecution(taskId, { ...execution, phase: 'READY', remainingMs: 0, resumedAt: null });
    }
    this.dispatch();
  }

  private finishAttempt(taskId: string): void {
    const task = this.store.getById(taskId);
    if (!task || task.status !== 'PROCESSING') {
      this.setExecution(taskId, null);
      return;
    }

    const completedAt = this.isoNow();
    const failed = this.random.next() < task.failureProbability;

    if (!failed) {
      this.store.transition(taskId, 'COMPLETED', {
        patch: { completedAt },
        event: {
          type: 'COMPLETED',
          message: `${taskId} concluída na tentativa ${task.attempts}.`,
        },
      });
      this.setExecution(taskId, null);
      return;
    }

    const settings = this.settingsStore.settings();
    const retry = canRetry(task.attempts, settings.maxRetries);
    this.store.transition(taskId, 'FAILED', {
      patch: { completedAt },
      event: {
        type: 'FAILED',
        message: retry
          ? `${taskId} falhou na tentativa ${task.attempts}.`
          : `${taskId} falhou na tentativa ${task.attempts}. Limite de tentativas atingido.`,
      },
    });

    if (!retry) {
      this.setExecution(taskId, null);
      return;
    }

    const delay = retryDelayMs(task.attempts, settings);
    this.store.transition(taskId, 'RETRYING', {
      event: {
        type: 'RETRY_SCHEDULED',
        message: `${taskId} agendou a tentativa ${task.attempts + 1} em ${formatDuration(delay)}.`,
      },
    });
    this.setExecution(taskId, {
      taskId,
      phase: 'BACKOFF',
      remainingMs: delay,
      totalMs: delay,
      resumedAt: null,
      speed: this.speed(),
    });
    this.schedule(taskId);
  }

  /** Starts (or restarts) the timer for the current phase of an execution. */
  private schedule(taskId: string): void {
    const execution = this.executionOf(taskId);
    if (!execution || execution.phase === 'READY') {
      return;
    }

    this.timers.get(taskId)?.unsubscribe();
    const speed = this.speed();
    this.setExecution(taskId, { ...execution, resumedAt: this.clock.now(), speed });
    this.timers.set(
      taskId,
      timer(execution.remainingMs / speed).subscribe(() => this.onTimerElapsed(taskId)),
    );
  }

  /** Stops the timer and stores how much simulated time is left. */
  private freeze(taskId: string): void {
    const execution = this.executionOf(taskId);
    this.timers.get(taskId)?.unsubscribe();
    this.timers.delete(taskId);
    if (!execution || execution.resumedAt === null) {
      return;
    }

    const elapsed = (this.clock.now() - execution.resumedAt) * execution.speed;
    this.setExecution(taskId, {
      ...execution,
      remainingMs: Math.max(0, execution.remainingMs - elapsed),
      resumedAt: null,
    });
  }

  private reschedule(): void {
    if (this._status() !== 'RUNNING') {
      return;
    }
    for (const execution of this.executions()) {
      if (execution.phase !== 'READY') {
        this.freeze(execution.taskId);
        this.schedule(execution.taskId);
      }
    }
  }

  private cancelTimers(): void {
    for (const subscription of this.timers.values()) {
      subscription.unsubscribe();
    }
    this.timers.clear();
  }

  private setExecution(taskId: string, execution: Execution | null): void {
    this._executions.update((current) => {
      const next = new Map(current);
      if (execution) {
        next.set(taskId, execution);
      } else {
        next.delete(taskId);
      }
      return next;
    });
  }

  private speed(): number {
    return this.settingsStore.settings().speed;
  }

  private isoNow(): string {
    return new Date(this.clock.now()).toISOString();
  }
}
