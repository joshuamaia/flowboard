import { DEFAULT_SIMULATION_SETTINGS } from '../../features/simulation/models/simulation-settings.model';
import { decodeSnapshot, encodeSnapshot } from './snapshot-codec';
import { PersistenceSnapshot } from './persistence-snapshot.model';

const snapshot: PersistenceSnapshot = {
  version: 1,
  savedAt: '2026-01-01T10:00:00.000Z',
  tasks: [
    {
      id: 'TASK-001',
      sequence: 1,
      title: 'Tarefa',
      priority: 'HIGH',
      status: 'COMPLETED',
      durationMs: 1000,
      failureProbability: 0.1,
      attempts: 1,
      createdAt: '2026-01-01T09:59:00.000Z',
      startedAt: '2026-01-01T09:59:01.000Z',
      completedAt: '2026-01-01T09:59:02.000Z',
    },
  ],
  events: [
    {
      id: 'EVT-1',
      taskId: 'TASK-001',
      type: 'CREATED',
      timestamp: '2026-01-01T09:59:00.000Z',
      fromStatus: null,
      toStatus: 'PENDING',
      attempt: 0,
      message: 'TASK-001 criada.',
    },
  ],
  nextTaskSequence: 2,
  nextEventId: 2,
  settings: DEFAULT_SIMULATION_SETTINGS,
  theme: 'dark',
};

describe('snapshot codec', () => {
  it('round-trips a snapshot', () => {
    expect(decodeSnapshot(encodeSnapshot(snapshot))).toEqual({
      ok: true,
      snapshot,
      discarded: 0,
    });
  });

  it('reports empty, invalid JSON and invalid shapes', () => {
    expect(decodeSnapshot(null)).toEqual({ ok: false, reason: 'empty' });
    expect(decodeSnapshot('{oops')).toEqual({ ok: false, reason: 'invalid-json' });
    expect(decodeSnapshot('[]')).toEqual({ ok: false, reason: 'invalid-shape' });
    expect(decodeSnapshot('{"version":1}')).toEqual({ ok: false, reason: 'invalid-shape' });
  });

  it('rejects unknown versions', () => {
    expect(decodeSnapshot(JSON.stringify({ ...snapshot, version: 2 }))).toEqual({
      ok: false,
      reason: 'unsupported-version',
    });
  });

  it('drops invalid entries instead of failing', () => {
    const raw = JSON.stringify({
      ...snapshot,
      tasks: [...snapshot.tasks, { id: 'TASK-X', status: 'WEIRD' }],
      events: [...snapshot.events, { id: 1 }],
    });

    const result = decodeSnapshot(raw);

    expect(result.ok && result.snapshot.tasks).toHaveLength(1);
    expect(result.ok && result.snapshot.events).toHaveLength(1);
    expect(result.ok && result.discarded).toBe(2);
  });

  it('sanitizes settings and theme', () => {
    const raw = JSON.stringify({
      ...snapshot,
      settings: { maxConcurrency: 999, speed: 3, retryStrategy: 'MAGIC' },
      theme: 'neon',
    });

    const result = decodeSnapshot(raw);

    expect(result.ok && result.snapshot.settings).toEqual({
      ...DEFAULT_SIMULATION_SETTINGS,
      maxConcurrency: 10,
    });
    expect(result.ok && result.snapshot.theme).toBe('dark');
  });
});
