import { computed, DOCUMENT, inject, Injectable } from '@angular/core';

import { ThemeService } from '../../../core/services/theme.service';

export interface ChartPalette {
  text: string;
  textMuted: string;
  grid: string;
  surface: string;
  primary: string;
  success: string;
  danger: string;
  pending: string;
  processing: string;
  retrying: string;
  completed: string;
  failed: string;
  fontFamily: string;
}

/** Fallbacks (dark theme) for environments without computed custom properties. */
const FALLBACK: ChartPalette = {
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  grid: '#334155',
  surface: '#1e293b',
  primary: '#3b82f6',
  success: '#22c55e',
  danger: '#ef4444',
  pending: '#3b82f6',
  processing: '#f59e0b',
  retrying: '#a855f7',
  completed: '#22c55e',
  failed: '#ef4444',
  fontFamily: 'Inter, system-ui, sans-serif',
};

const TOKENS: Readonly<Record<keyof ChartPalette, string>> = {
  text: '--fb-text',
  textMuted: '--fb-text-muted',
  grid: '--fb-border',
  surface: '--fb-surface',
  primary: '--fb-primary',
  success: '--fb-success',
  danger: '--fb-danger',
  pending: '--fb-status-pending',
  processing: '--fb-status-processing',
  retrying: '--fb-status-retrying',
  completed: '--fb-status-completed',
  failed: '--fb-status-failed',
  fontFamily: '--fb-font-sans',
};

/**
 * Resolves design tokens into concrete colors for Chart.js (canvas cannot read
 * CSS variables). Recomputed whenever the theme changes.
 */
@Injectable({ providedIn: 'root' })
export class ChartPaletteService {
  private readonly document = inject(DOCUMENT);
  private readonly theme = inject(ThemeService).theme;

  readonly palette = computed<ChartPalette>(() => {
    this.theme();
    const styles = this.document.defaultView?.getComputedStyle(this.document.documentElement);
    const entries = Object.entries(TOKENS).map(([key, token]) => {
      const value = styles?.getPropertyValue(token).trim();
      return [key, value || FALLBACK[key as keyof ChartPalette]];
    });
    return Object.fromEntries(entries) as ChartPalette;
  });
}
