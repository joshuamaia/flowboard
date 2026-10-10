import { TaskEventType } from './task-event.model';
import { TaskStatus } from './task.model';

export interface TransitionDescriptor {
  event: TaskEventType;
  /** Past-tense description, prefixed by the task id in the history. */
  message: string;
}

/**
 * Single source of truth for the task lifecycle. A transition is valid only
 * if it is listed here.
 *
 *   PENDING ─► PROCESSING ─► COMPLETED
 *                  │  ▲
 *                  ▼  │
 *               FAILED ─► RETRYING
 *
 * PROCESSING/RETRYING ─► PENDING covers interruption; FAILED ─► PENDING is a
 * manual requeue once automatic retries are exhausted.
 */
const TRANSITIONS: Readonly<
  Record<TaskStatus, Partial<Readonly<Record<TaskStatus, TransitionDescriptor>>>>
> = {
  PENDING: {
    PROCESSING: { event: 'STARTED', message: 'iniciou processamento' },
  },
  PROCESSING: {
    COMPLETED: { event: 'COMPLETED', message: 'concluída' },
    FAILED: { event: 'FAILED', message: 'falhou' },
    PENDING: { event: 'INTERRUPTED', message: 'interrompida e devolvida à fila' },
  },
  FAILED: {
    RETRYING: { event: 'RETRY_SCHEDULED', message: 'agendou nova tentativa' },
    PENDING: { event: 'REQUEUED', message: 'reenviada manualmente para a fila' },
  },
  RETRYING: {
    PROCESSING: { event: 'RETRY_STARTED', message: 'iniciou retry' },
    PENDING: { event: 'INTERRUPTED', message: 'retry cancelado e devolvida à fila' },
  },
  COMPLETED: {},
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from][to] !== undefined;
}

export function allowedTransitions(from: TaskStatus): TaskStatus[] {
  return Object.keys(TRANSITIONS[from]) as TaskStatus[];
}

export function describeTransition(
  from: TaskStatus,
  to: TaskStatus,
): TransitionDescriptor | undefined {
  return TRANSITIONS[from][to];
}
