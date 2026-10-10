import { Task } from './task.model';

export function formatTaskId(sequence: number): string {
  return `TASK-${String(sequence).padStart(3, '0')}`;
}

/** Wall-clock time of the last attempt, available once the task finished. */
export function processingTimeMs(task: Task): number | undefined {
  if (!task.startedAt || !task.completedAt) {
    return undefined;
  }
  return Date.parse(task.completedAt) - Date.parse(task.startedAt);
}
