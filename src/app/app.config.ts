import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import {
  ApplicationConfig,
  inject,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideRouter,
  TitleStrategy,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';

import { routes } from './app.routes';
import { PageTitleStrategy } from './core/services/page-title.strategy';
import { ThemeService } from './core/services/theme.service';
import { PersistenceService } from './core/storage/persistence.service';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    { provide: TitleStrategy, useExisting: PageTitleStrategy },
    // Restore persisted state (and apply the saved theme) before the first render.
    provideAppInitializer(() => {
      inject(ThemeService);
      inject(PersistenceService);
    }),
  ],
};
