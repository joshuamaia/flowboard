import { TaskEvent, TaskEventType } from '../../tasks/models/task-event.model';

export const EVENT_PERIODS = [
  { id: 'ALL', label: 'Todo o período', windowMs: null },
  { id: 'LAST_MINUTE', label: 'Último minuto', windowMs: 60_000 },
  { id: 'LAST_5_MINUTES', label: 'Últimos 5 minutos', windowMs: 5 * 60_000 },
  { id: 'LAST_15_MINUTES', label: 'Últimos 15 minutos', windowMs: 15 * 60_000 },
  { id: 'LAST_HOUR', label: 'Última hora', windowMs: 60 * 60_000 },
] as const;

export type EventPeriod = (typeof EVENT_PERIODS)[number]['id'];

export interface EventFilters {
  /** Task id, or '' for all tasks. */
  taskId: string;
  /** Event type, or '' for all types. */
  type: TaskEventType | '';
  period: EventPeriod;
}

export const EMPTY_EVENT_FILTERS: EventFilters = { taskId: '', type: '', period: 'ALL' };

/** Returns matching events, newest first. */
export function filterEvents(
  events: readonly TaskEvent[],
  filters: EventFilters,
  now: number,
): TaskEvent[] {
  const windowMs = EVENT_PERIODS.find((period) => period.id === filters.period)?.windowMs ?? null;
  const since = windowMs === null ? null : now - windowMs;

  return events
    .filter(
      (event) =>
        (!filters.taskId || event.taskId === filters.taskId) &&
        (!filters.type || event.type === filters.type) &&
        (since === null || Date.parse(event.timestamp) >= since),
    )
    .reverse();
}
