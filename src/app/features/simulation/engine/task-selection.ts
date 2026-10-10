import { Task, TaskPriority } from '../../tasks/models/task.model';

const PRIORITY_WEIGHT: Readonly<Record<TaskPriority, number>> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/** Higher priority first; FIFO (creation sequence) within the same priority. */
export function compareForDispatch(a: Task, b: Task): number {
  return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || a.sequence - b.sequence;
}

/** Picks up to `slots` tasks in dispatch order without mutating the input. */
export function selectNextTasks(candidates: readonly Task[], slots: number): Task[] {
  if (slots <= 0) {
    return [];
  }
  return [...candidates].sort(compareForDispatch).slice(0, slots);
}
