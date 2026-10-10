import { Theme } from '../models/theme.model';
import { SimulationSettings } from '../../features/simulation/models/simulation-settings.model';
import { Task } from '../../features/tasks/models/task.model';
import { TaskEvent } from '../../features/tasks/models/task-event.model';

/** Bump when the shape changes and add a migration in snapshot-codec.ts. */
export const SNAPSHOT_VERSION = 1;

export const STORAGE_KEY = 'flowboard:state';

export interface PersistenceSnapshot {
  version: typeof SNAPSHOT_VERSION;
  savedAt: string;
  tasks: Task[];
  events: TaskEvent[];
  nextTaskSequence: number;
  nextEventId: number;
  settings: SimulationSettings;
  theme: Theme;
}
