import { DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';

import { Theme } from '../models/theme.model';

const THEME_COLOR: Record<Theme, string> = {
  dark: '#0f172a',
  light: '#f1f5f9',
};

/**
 * Owns the active color theme and reflects it on the document root.
 * Persistence of the preference is wired in the persistence layer.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly _theme = signal<Theme>('dark');

  readonly theme = this._theme.asReadonly();

  constructor() {
    effect(() => {
      const theme = this._theme();
      const root = this.document.documentElement;
      root.dataset['theme'] = theme;
      this.document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', THEME_COLOR[theme]);
    });
  }

  setTheme(theme: Theme): void {
    this._theme.set(theme);
  }

  toggle(): void {
    this._theme.update((current) => (current === 'dark' ? 'light' : 'dark'));
  }
}
