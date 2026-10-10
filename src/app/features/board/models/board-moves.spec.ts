import { Task, TaskStatus } from '../../tasks/models/task.model';
import { BoardColumnId } from './board-columns';
import { canBeDragged, resolveManualMove } from './board-moves';

const taskIn = (status: TaskStatus): Task => ({
  id: 'TASK-001',
  sequence: 1,
  title: 'Tarefa',
  priority: 'MEDIUM',
  status,
  durationMs: 1000,
  failureProbability: 0,
  attempts: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('board manual moves', () => {
  it('requeues a failed task dropped on Pendentes', () => {
    expect(resolveManualMove(taskIn('FAILED'), 'pending')).toBe('REQUEUE');
  });

  it.each<TaskStatus>(['PROCESSING', 'RETRYING'])(
    'interrupts a %s task dropped on Pendentes',
    (status) => {
      expect(resolveManualMove(taskIn(status), 'pending')).toBe('INTERRUPT');
    },
  );

  it('rejects every move into Processando, Concluídas or Falhas', () => {
    const statuses: TaskStatus[] = ['PENDING', 'PROCESSING', 'RETRYING', 'COMPLETED', 'FAILED'];
    const targets: BoardColumnId[] = ['processing', 'completed', 'failed'];

    for (const status of statuses) {
      for (const target of targets) {
        expect(resolveManualMove(taskIn(status), target), `${status} → ${target}`).toBeNull();
      }
    }
  });

  it('only lets tasks with a valid move be dragged', () => {
    expect(canBeDragged(taskIn('PENDING'))).toBe(false);
    expect(canBeDragged(taskIn('COMPLETED'))).toBe(false);
    expect(canBeDragged(taskIn('FAILED'))).toBe(true);
    expect(canBeDragged(taskIn('PROCESSING'))).toBe(true);
  });
});
