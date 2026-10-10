import { TaskStatus } from './task.model';

export const TASK_EVENT_TYPES = [
  'CREATED',
  'UPDATED',
  'STARTED',
  'COMPLETED',
  'FAILED',
  'RETRY_SCHEDULED',
  'RETRY_STARTED',
  'REQUEUED',
  'INTERRUPTED',
  'RECOVERED',
  'DELETED',
] as const;
export type TaskEventType = (typeof TASK_EVENT_TYPES)[number];

export interface TaskEvent {
  id: string;
  taskId: string;
  type: TaskEventType;
  timestamp: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  /** Attempt number of the task at the moment of the event. */
  attempt: number;
  message: string;
}

export type NewTaskEvent = Omit<TaskEvent, 'id' | 'timestamp'>;
