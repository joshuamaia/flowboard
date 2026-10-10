import { Task } from '../../tasks/models/task.model';
import { BoardColumnId } from './board-columns';

/**
 * Manual moves a user may perform on the board:
 * - REQUEUE: a definitively failed task goes back to the queue;
 * - INTERRUPT: an in-flight task is cancelled and goes back to the queue.
 * Everything else (e.g. forcing a task into "Concluídas") is not allowed.
 */
export type ManualMove = 'REQUEUE' | 'INTERRUPT';

export function resolveManualMove(task: Task, target: BoardColumnId): ManualMove | null {
  if (target !== 'pending') {
    return null;
  }
  if (task.status === 'FAILED') {
    return 'REQUEUE';
  }
  if (task.status === 'PROCESSING' || task.status === 'RETRYING') {
    return 'INTERRUPT';
  }
  return null;
}

export function canBeDragged(task: Task): boolean {
  return resolveManualMove(task, 'pending') !== null;
}
