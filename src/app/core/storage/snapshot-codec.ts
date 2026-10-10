import { sanitizeSettings } from '../../features/simulation/models/simulation-settings.model';
import {
  Task,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TaskPriority,
  TaskStatus,
} from '../../features/tasks/models/task.model';
import {
  TASK_EVENT_TYPES,
  TaskEvent,
  TaskEventType,
} from '../../features/tasks/models/task-event.model';
import { Theme } from '../models/theme.model';
import { PersistenceSnapshot, SNAPSHOT_VERSION } from './persistence-snapshot.model';

export type DecodeResult =
  | { ok: true; snapshot: PersistenceSnapshot; discarded: number }
  | { ok: false; reason: 'empty' | 'invalid-json' | 'invalid-shape' | 'unsupported-version' };

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isOptionalString = (value: unknown) => value === undefined || isString(value);

function isTask(value: unknown): value is Task {
  return (
    isObject(value) &&
    isString(value['id']) &&
    isNumber(value['sequence']) &&
    isString(value['title']) &&
    isOptionalString(value['description']) &&
    TASK_PRIORITIES.includes(value['priority'] as TaskPriority) &&
    TASK_STATUSES.includes(value['status'] as TaskStatus) &&
    isNumber(value['durationMs']) &&
    isNumber(value['failureProbability']) &&
    isNumber(value['attempts']) &&
    isString(value['createdAt']) &&
    isOptionalString(value['startedAt']) &&
    isOptionalString(value['completedAt'])
  );
}

const isStatusOrNull = (value: unknown) =>
  value === null || TASK_STATUSES.includes(value as TaskStatus);

function isTaskEvent(value: unknown): value is TaskEvent {
  return (
    isObject(value) &&
    isString(value['id']) &&
    isString(value['taskId']) &&
    TASK_EVENT_TYPES.includes(value['type'] as TaskEventType) &&
    isString(value['timestamp']) &&
    isStatusOrNull(value['fromStatus']) &&
    isStatusOrNull(value['toStatus']) &&
    isNumber(value['attempt']) &&
    isString(value['message'])
  );
}

/**
 * Upgrades older snapshot shapes, one version at a time. Version 1 is the
 * first format, so there is nothing to migrate yet:
 *   const MIGRATIONS = { 1: (v1) => ({ ...v1, version: 2, newField: ... }) };
 */
const MIGRATIONS: Readonly<Record<number, (snapshot: Json) => Json>> = {};

function migrate(snapshot: Json): Json | null {
  let current = snapshot;
  while (isNumber(current['version']) && current['version'] < SNAPSHOT_VERSION) {
    const step = MIGRATIONS[current['version']];
    if (!step) {
      return null;
    }
    current = step(current);
  }
  return current['version'] === SNAPSHOT_VERSION ? current : null;
}

export function encodeSnapshot(snapshot: PersistenceSnapshot): string {
  return JSON.stringify(snapshot);
}

/**
 * Parses and validates persisted state. Never throws: invalid entries are
 * dropped (and counted) instead of breaking the app on startup.
 */
export function decodeSnapshot(raw: string | null): DecodeResult {
  if (!raw) {
    return { ok: false, reason: 'empty' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }
  if (!isObject(parsed) || !isNumber(parsed['version'])) {
    return { ok: false, reason: 'invalid-shape' };
  }

  const data = migrate(parsed);
  if (!data) {
    return { ok: false, reason: 'unsupported-version' };
  }
  if (!Array.isArray(data['tasks']) || !Array.isArray(data['events'])) {
    return { ok: false, reason: 'invalid-shape' };
  }

  const tasks = data['tasks'].filter(isTask);
  const events = data['events'].filter(isTaskEvent);
  const theme: Theme = data['theme'] === 'light' ? 'light' : 'dark';

  return {
    ok: true,
    discarded: data['tasks'].length - tasks.length + (data['events'].length - events.length),
    snapshot: {
      version: SNAPSHOT_VERSION,
      savedAt: isString(data['savedAt']) ? data['savedAt'] : new Date(0).toISOString(),
      tasks,
      events,
      nextTaskSequence: isNumber(data['nextTaskSequence']) ? data['nextTaskSequence'] : 1,
      nextEventId: isNumber(data['nextEventId']) ? data['nextEventId'] : 1,
      settings: sanitizeSettings(data['settings']),
      theme,
    },
  };
}
