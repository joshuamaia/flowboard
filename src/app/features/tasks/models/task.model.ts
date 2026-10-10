export const TASK_STATUSES = ['PENDING', 'PROCESSING', 'RETRYING', 'COMPLETED', 'FAILED'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface Task {
  /** Human readable identifier, e.g. `TASK-001`. */
  id: string;
  /** Monotonic creation order, used for FIFO ordering within a priority. */
  sequence: number;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  /** Simulated processing duration of a single attempt. */
  durationMs: number;
  /** Probability (0–1) that a single attempt fails. */
  failureProbability: number;
  attempts: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface NewTaskInput {
  title: string;
  description?: string;
  priority: TaskPriority;
  durationMs: number;
  failureProbability: number;
}

/** Fields a user may edit without going through the state machine. */
export type TaskChanges = Partial<
  Pick<Task, 'title' | 'description' | 'priority' | 'durationMs' | 'failureProbability'>
>;

/** Execution bookkeeping that may accompany a status transition. */
export type TransitionPatch = Partial<Pick<Task, 'attempts' | 'startedAt' | 'completedAt'>>;
