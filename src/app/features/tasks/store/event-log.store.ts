import { inject, Injectable, signal } from '@angular/core';

import { Clock } from '../../../core/utils/clock';
import { NewTaskEvent, TaskEvent } from '../models/task-event.model';

/** Oldest events are dropped beyond this, keeping memory and localStorage bounded. */
export const MAX_EVENTS = 2000;

/** Append-only log of everything that happened to tasks. */
@Injectable({ providedIn: 'root' })
export class EventLogStore {
  private readonly clock = inject(Clock);
  private readonly _events = signal<readonly TaskEvent[]>([]);
  private nextId = 1;

  readonly events = this._events.asReadonly();

  get nextEventId(): number {
    return this.nextId;
  }

  record(event: NewTaskEvent): TaskEvent {
    const entry: TaskEvent = {
      ...event,
      id: `EVT-${this.nextId++}`,
      timestamp: new Date(this.clock.now()).toISOString(),
    };
    this._events.update((events) => [...events, entry].slice(-MAX_EVENTS));
    return entry;
  }

  restore(events: readonly TaskEvent[], nextId: number): void {
    const kept = events.slice(-MAX_EVENTS);
    const highest = kept.reduce(
      (max, event) => Math.max(max, Number(event.id.replace('EVT-', '')) || 0),
      0,
    );
    this.nextId = Math.max(nextId, highest + 1);
    this._events.set(kept);
  }

  clear(): void {
    this.nextId = 1;
    this._events.set([]);
  }
}
