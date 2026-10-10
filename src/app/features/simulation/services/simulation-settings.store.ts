import { Injectable, signal } from '@angular/core';

import {
  DEFAULT_SIMULATION_SETTINGS,
  sanitizeSettings,
  SimulationSettings,
} from '../models/simulation-settings.model';

@Injectable({ providedIn: 'root' })
export class SimulationSettingsStore {
  private readonly _settings = signal<SimulationSettings>(DEFAULT_SIMULATION_SETTINGS);

  readonly settings = this._settings.asReadonly();

  update(changes: Partial<SimulationSettings>): void {
    this._settings.update((current) => ({ ...current, ...changes }));
  }

  /** Applies untrusted settings (e.g. from storage), sanitized. */
  restore(settings: unknown): void {
    this._settings.set(sanitizeSettings(settings));
  }

  reset(): void {
    this._settings.set(DEFAULT_SIMULATION_SETTINGS);
  }
}
