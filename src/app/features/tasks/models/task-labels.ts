import { TaskEventType } from './task-event.model';
import { TaskPriority, TaskStatus } from './task.model';

export const EVENT_TYPE_LABELS: Readonly<Record<TaskEventType, string>> = {
  CREATED: 'Criada',
  UPDATED: 'Atualizada',
  STARTED: 'Início',
  COMPLETED: 'Concluída',
  FAILED: 'Falha',
  RETRY_SCHEDULED: 'Retry agendado',
  RETRY_STARTED: 'Retry iniciado',
  REQUEUED: 'Reenviada',
  INTERRUPTED: 'Interrompida',
  RECOVERED: 'Recuperada',
  DELETED: 'Excluída',
};

export const STATUS_LABELS: Readonly<Record<TaskStatus, string>> = {
  PENDING: 'Pendente',
  PROCESSING: 'Processando',
  RETRYING: 'Aguardando retry',
  COMPLETED: 'Concluída',
  FAILED: 'Falhou',
};

export const PRIORITY_LABELS: Readonly<Record<TaskPriority, string>> = {
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
};
