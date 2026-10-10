import { TaskEvent, TaskEventType } from '../../tasks/models/task-event.model';
import { EMPTY_EVENT_FILTERS, filterEvents } from './event-filters';

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);

const event = (id: number, taskId: string, type: TaskEventType, agoMs: number): TaskEvent => ({
  id: `EVT-${id}`,
  taskId,
  type,
  timestamp: new Date(NOW - agoMs).toISOString(),
  fromStatus: null,
  toStatus: 'PENDING',
  attempt: 0,
  message: '',
});

const events = [
  event(1, 'TASK-001', 'CREATED', 20 * 60_000),
  event(2, 'TASK-002', 'CREATED', 4 * 60_000),
  event(3, 'TASK-001', 'STARTED', 30_000),
  event(4, 'TASK-001', 'FAILED', 10_000),
];

const ids = (result: TaskEvent[]) => result.map((e) => e.id);

describe('filterEvents', () => {
  it('returns all events newest first without filters', () => {
    expect(ids(filterEvents(events, EMPTY_EVENT_FILTERS, NOW))).toEqual([
      'EVT-4',
      'EVT-3',
      'EVT-2',
      'EVT-1',
    ]);
  });

  it('filters by task', () => {
    const result = filterEvents(events, { ...EMPTY_EVENT_FILTERS, taskId: 'TASK-002' }, NOW);

    expect(ids(result)).toEqual(['EVT-2']);
  });

  it('filters by type', () => {
    const result = filterEvents(events, { ...EMPTY_EVENT_FILTERS, type: 'CREATED' }, NOW);

    expect(ids(result)).toEqual(['EVT-2', 'EVT-1']);
  });

  it('filters by period relative to now', () => {
    expect(
      ids(filterEvents(events, { ...EMPTY_EVENT_FILTERS, period: 'LAST_MINUTE' }, NOW)),
    ).toEqual(['EVT-4', 'EVT-3']);
    expect(
      ids(filterEvents(events, { ...EMPTY_EVENT_FILTERS, period: 'LAST_5_MINUTES' }, NOW)),
    ).toEqual(['EVT-4', 'EVT-3', 'EVT-2']);
  });

  it('combines filters', () => {
    const result = filterEvents(
      events,
      { taskId: 'TASK-001', type: 'FAILED', period: 'LAST_MINUTE' },
      NOW,
    );

    expect(ids(result)).toEqual(['EVT-4']);
  });

  it('does not mutate the input', () => {
    filterEvents(events, EMPTY_EVENT_FILTERS, NOW);

    expect(events[0].id).toBe('EVT-1');
  });
});
