import { DestroyRef, DOCUMENT, effect, inject, Injectable, untracked } from '@angular/core';

import { SimulationSettingsStore } from '../../features/simulation/services/simulation-settings.store';
import { EventLogStore } from '../../features/tasks/store/event-log.store';
import { TaskStore } from '../../features/tasks/store/task.store';
import { ThemeService } from '../services/theme.service';
import { ToastService } from '../services/toast.service';
import { Clock } from '../utils/clock';
import { BROWSER_STORAGE } from './browser-storage';
import { PersistenceSnapshot, SNAPSHOT_VERSION, STORAGE_KEY } from './persistence-snapshot.model';
import { decodeSnapshot, encodeSnapshot } from './snapshot-codec';

/** At most one localStorage write per window while state changes rapidly. */
const SAVE_DEBOUNCE_MS = 300;

export interface RestoreSummary {
  tasks: number;
  /** Tasks that were in flight and were returned to the queue. */
  recovered: number;
}

/**
 * Keeps app state in localStorage.
 *
 * On creation it restores the last snapshot (normalizing in-flight tasks back
 * to PENDING — old timers are never resumed), then an effect saves a new
 * snapshot whenever tasks, history, settings or theme change. Saves are
 * throttled and flushed when the page is hidden.
 */
@Injectable({ providedIn: 'root' })
export class PersistenceService {
  private readonly storage = inject(BROWSER_STORAGE);
  private readonly tasks = inject(TaskStore);
  private readonly events = inject(EventLogStore);
  private readonly settings = inject(SimulationSettingsStore);
  private readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);
  private readonly clock = inject(Clock);

  /** Whether this browser offers localStorage at all. */
  readonly available = this.storage !== null;

  /** Avoids a toast per write while storage keeps failing. */
  private saveFailing = false;

  /** Result of the restore performed at startup (null if nothing was restored). */
  readonly restored: RestoreSummary | null;

  /** Latest unsaved snapshot; writes are coalesced while the simulation runs. */
  private pending: PersistenceSnapshot | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.restored = this.restore();

    effect(() => {
      const snapshot: Omit<PersistenceSnapshot, 'savedAt' | 'nextTaskSequence' | 'nextEventId'> = {
        version: SNAPSHOT_VERSION,
        tasks: [...this.tasks.tasks()],
        events: [...this.events.events()],
        settings: this.settings.settings(),
        theme: this.theme.theme(),
      };
      untracked(() =>
        this.schedule({
          ...snapshot,
          savedAt: new Date(this.clock.now()).toISOString(),
          nextTaskSequence: this.tasks.nextTaskSequence,
          nextEventId: this.events.nextEventId,
        }),
      );
    });

    // Don't lose the last changes when the tab is closed or reloaded.
    const view = inject(DOCUMENT).defaultView;
    const onPageHide = () => this.flush();
    view?.addEventListener('pagehide', onPageHide);
    inject(DestroyRef).onDestroy(() => {
      view?.removeEventListener('pagehide', onPageHide);
      this.flush();
    });

    if (this.restored && this.restored.tasks > 0) {
      const { tasks, recovered } = this.restored;
      this.toast.show(
        recovered > 0
          ? `Estado restaurado: ${tasks} tarefa(s), ${recovered} devolvida(s) à fila.`
          : `Estado restaurado: ${tasks} tarefa(s).`,
      );
    }
  }

  /** Writes the pending snapshot right away. */
  flush(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.pending) {
      const snapshot = this.pending;
      this.pending = null;
      this.write(snapshot);
    }
  }

  /** Removes the persisted snapshot (the next state change writes a fresh one). */
  clearStorage(): void {
    this.pending = null;
    try {
      this.storage?.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable: nothing to clear.
    }
  }

  private restore(): RestoreSummary | null {
    let raw: string | null;
    try {
      raw = this.storage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }

    const result = decodeSnapshot(raw);
    if (!result.ok) {
      if (result.reason !== 'empty') {
        this.toast.error('Os dados salvos eram inválidos e foram ignorados.');
      }
      return null;
    }

    const { snapshot } = result;
    this.settings.restore(snapshot.settings);
    this.theme.setTheme(snapshot.theme);
    this.events.restore(snapshot.events, snapshot.nextEventId);
    this.tasks.restore(snapshot.tasks, snapshot.nextTaskSequence);

    // Timers do not survive a reload: in-flight work goes back to the queue.
    const inFlight = snapshot.tasks.filter(
      (task) => task.status === 'PROCESSING' || task.status === 'RETRYING',
    );
    for (const task of inFlight) {
      this.tasks.transition(task.id, 'PENDING', {
        patch: { startedAt: undefined, completedAt: undefined },
        event: {
          type: 'RECOVERED',
          message: `${task.id} recuperada após recarregar a página e devolvida à fila.`,
        },
      });
    }

    return { tasks: snapshot.tasks.length, recovered: inFlight.length };
  }

  private schedule(snapshot: PersistenceSnapshot): void {
    this.pending = snapshot;
    this.saveTimer ??= setTimeout(() => this.flush(), SAVE_DEBOUNCE_MS);
  }

  private write(snapshot: PersistenceSnapshot): void {
    if (!this.storage) {
      return;
    }
    try {
      this.storage.setItem(STORAGE_KEY, encodeSnapshot(snapshot));
      this.saveFailing = false;
    } catch {
      if (!this.saveFailing) {
        this.saveFailing = true;
        this.toast.error(
          'Não foi possível salvar os dados no navegador (armazenamento cheio ou bloqueado).',
        );
      }
    }
  }
}
