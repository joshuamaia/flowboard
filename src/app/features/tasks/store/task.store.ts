import { computed, inject, Injectable, signal } from '@angular/core';

import { Clock } from '../../../core/utils/clock';
import { STATUS_LABELS } from '../models/task-labels';
import { describeTransition } from '../models/task-state-machine';
import { TaskEventType } from '../models/task-event.model';
import {
  NewTaskInput,
  Task,
  TASK_STATUSES,
  TaskChanges,
  TaskStatus,
  TransitionPatch,
} from '../models/task.model';
import { formatTaskId } from '../models/task.utils';
import { EventLogStore } from './event-log.store';

export type TransitionResult = { ok: true; task: Task } | { ok: false; error: string };

export interface TransitionOptions {
  patch?: TransitionPatch;
  /** Overrides the default event type/message from the state machine. */
  event?: { type: TaskEventType; message: string };
}

/**
 * Owns the task collection. Components only read signals and call the
 * explicit methods below; every change is immutable and traced in the event log.
 */
@Injectable({ providedIn: 'root' })
export class TaskStore {
  private readonly clock = inject(Clock);
  private readonly eventLog = inject(EventLogStore);
  private readonly _tasks = signal<readonly Task[]>([]);
  private nextSequence = 1;

  readonly tasks = this._tasks.asReadonly();
  readonly count = computed(() => this._tasks().length);

  readonly tasksByStatus = computed(() => {
    const groups = {} as Record<TaskStatus, Task[]>;
    for (const status of TASK_STATUSES) {
      groups[status] = [];
    }
    for (const task of this._tasks()) {
      groups[task.status].push(task);
    }
    return groups as Readonly<Record<TaskStatus, readonly Task[]>>;
  });

  readonly pending = computed(() => this.tasksByStatus().PENDING);
  readonly processing = computed(() => this.tasksByStatus().PROCESSING);
  readonly retrying = computed(() => this.tasksByStatus().RETRYING);
  readonly completed = computed(() => this.tasksByStatus().COMPLETED);
  readonly failed = computed(() => this.tasksByStatus().FAILED);

  /** Next sequence number, persisted so ids never repeat after a reload. */
  get nextTaskSequence(): number {
    return this.nextSequence;
  }

  /** Replaces the whole collection (used when restoring persisted state). */
  restore(tasks: readonly Task[], nextSequence: number): void {
    const highest = tasks.reduce((max, task) => Math.max(max, task.sequence), 0);
    this.nextSequence = Math.max(nextSequence, highest + 1);
    this._tasks.set(tasks);
  }

  /** Removes every task and restarts ids at TASK-001. */
  clear(): void {
    this.nextSequence = 1;
    this._tasks.set([]);
  }

  getById(id: string): Task | undefined {
    return this._tasks().find((task) => task.id === id);
  }

  create(input: NewTaskInput): Task {
    const sequence = this.nextSequence++;
    const description = input.description?.trim();
    const task: Task = {
      id: formatTaskId(sequence),
      sequence,
      title: input.title.trim(),
      ...(description ? { description } : {}),
      priority: input.priority,
      status: 'PENDING',
      durationMs: input.durationMs,
      failureProbability: input.failureProbability,
      attempts: 0,
      createdAt: this.isoNow(),
    };

    this._tasks.update((tasks) => [...tasks, task]);
    this.eventLog.record({
      taskId: task.id,
      type: 'CREATED',
      fromStatus: null,
      toStatus: 'PENDING',
      attempt: 0,
      message: `${task.id} criada.`,
    });
    return task;
  }

  update(id: string, changes: TaskChanges): Task | undefined {
    const current = this.getById(id);
    if (!current) {
      return undefined;
    }

    const updated: Task = { ...current, ...changes };
    this.replace(updated);
    this.eventLog.record({
      taskId: id,
      type: 'UPDATED',
      fromStatus: current.status,
      toStatus: current.status,
      attempt: current.attempts,
      message: `${id} atualizada.`,
    });
    return updated;
  }

  /** Deletes a task that is not owned by the processing engine. */
  remove(id: string): boolean {
    const task = this.getById(id);
    if (!task || task.status === 'PROCESSING' || task.status === 'RETRYING') {
      return false;
    }

    this._tasks.update((tasks) => tasks.filter((item) => item.id !== id));
    this.eventLog.record({
      taskId: id,
      type: 'DELETED',
      fromStatus: task.status,
      toStatus: null,
      attempt: task.attempts,
      message: `${id} excluída.`,
    });
    return true;
  }

  /** Moves a task to a new status if the state machine allows it. */
  transition(id: string, to: TaskStatus, options: TransitionOptions = {}): TransitionResult {
    const current = this.getById(id);
    if (!current) {
      return { ok: false, error: `Tarefa ${id} não encontrada.` };
    }

    const descriptor = describeTransition(current.status, to);
    if (!descriptor) {
      return {
        ok: false,
        error: `Transição inválida: ${STATUS_LABELS[current.status]} → ${STATUS_LABELS[to]}.`,
      };
    }

    const updated: Task = { ...current, ...options.patch, status: to };
    this.replace(updated);
    this.eventLog.record({
      taskId: id,
      type: options.event?.type ?? descriptor.event,
      fromStatus: current.status,
      toStatus: to,
      attempt: updated.attempts,
      message: options.event?.message ?? `${id} ${descriptor.message}.`,
    });
    return { ok: true, task: updated };
  }

  private replace(task: Task): void {
    this._tasks.update((tasks) => tasks.map((item) => (item.id === task.id ? task : item)));
  }

  private isoNow(): string {
    return new Date(this.clock.now()).toISOString();
  }
}
