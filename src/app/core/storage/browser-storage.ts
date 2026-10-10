import { DOCUMENT, inject, InjectionToken } from '@angular/core';

/**
 * The browser's localStorage, or null when it is unavailable (private mode,
 * blocked site data, sandboxed iframes) — accessing it can throw.
 */
export const BROWSER_STORAGE = new InjectionToken<Storage | null>('BROWSER_STORAGE', {
  providedIn: 'root',
  factory: () => {
    try {
      return inject(DOCUMENT).defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  },
});
