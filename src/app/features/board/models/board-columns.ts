import { TaskStatus } from '../../tasks/models/task.model';

export type BoardColumnId = 'pending' | 'processing' | 'completed' | 'failed';

export interface BoardColumnDef {
  id: BoardColumnId;
  title: string;
  statuses: readonly TaskStatus[];
  emptyMessage: string;
}

export const BOARD_COLUMNS: readonly BoardColumnDef[] = [
  {
    id: 'pending',
    title: 'Pendentes',
    statuses: ['PENDING'],
    emptyMessage: 'Fila vazia. Ordenada pela próxima a ser processada.',
  },
  {
    id: 'processing',
    title: 'Processando',
    // Tasks waiting for a retry are still in flight, so they stay here.
    statuses: ['PROCESSING', 'RETRYING'],
    emptyMessage: 'Nenhum worker ocupado.',
  },
  {
    id: 'completed',
    title: 'Concluídas',
    statuses: ['COMPLETED'],
    emptyMessage: 'Nenhuma tarefa concluída ainda.',
  },
  {
    id: 'failed',
    title: 'Falhas',
    statuses: ['FAILED'],
    emptyMessage: 'Nenhuma falha definitiva.',
  },
];
