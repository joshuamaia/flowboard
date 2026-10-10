import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemoryStorage } from '../../../../testing/memory-storage';
import { ThemeService } from '../../../core/services/theme.service';
import { BROWSER_STORAGE } from '../../../core/storage/browser-storage';
import { DEFAULT_SIMULATION_SETTINGS } from '../../simulation/models/simulation-settings.model';
import { SimulationSettingsStore } from '../../simulation/services/simulation-settings.store';
import { SettingsPage } from './settings-page';

describe('SettingsPage', () => {
  let fixture: ComponentFixture<SettingsPage>;
  let page: SettingsPage;
  let settings: SimulationSettingsStore;
  let element: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: BROWSER_STORAGE, useValue: new MemoryStorage() }],
    });
    settings = TestBed.inject(SimulationSettingsStore);
    fixture = TestBed.createComponent(SettingsPage);
    page = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('starts from the current settings', () => {
    expect(page.form.getRawValue()).toEqual(DEFAULT_SIMULATION_SETTINGS);
  });

  it('applies valid changes to the store immediately', () => {
    page.form.patchValue({ maxConcurrency: 6, retryStrategy: 'FIXED', speed: 2 });

    expect(settings.settings()).toMatchObject({
      maxConcurrency: 6,
      retryStrategy: 'FIXED',
      speed: 2,
    });
  });

  it('rejects a backoff cap below the initial delay', () => {
    page.form.patchValue({ initialRetryDelayMs: 5000, maxRetryDelayMs: 2000 });
    fixture.detectChanges();

    expect(page.form.hasError('maxBelowInitial')).toBe(true);
    expect(settings.settings().maxRetryDelayMs).toBe(DEFAULT_SIMULATION_SETTINGS.maxRetryDelayMs);
    expect(element.querySelector('#set-max-delay-error')?.textContent).toContain('maior ou igual');
  });

  it('previews the exponential backoff sequence', () => {
    page.form.patchValue({
      maxRetries: 4,
      retryStrategy: 'EXPONENTIAL',
      initialRetryDelayMs: 1000,
      maxRetryDelayMs: 5000,
    });
    fixture.detectChanges();

    const steps = Array.from(element.querySelectorAll('.preview li'), (li) =>
      li.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(steps).toEqual([
      'Tentativa 1 executa imediatamente',
      'Tentativa 2 aguarda 1 s',
      'Tentativa 3 aguarda 2 s',
      'Tentativa 4 aguarda 4 s',
      'Tentativa 5 aguarda 5 s',
    ]);
  });

  it('switches the theme', () => {
    page.themeControl.setValue('light');

    expect(TestBed.inject(ThemeService).theme()).toBe('light');
  });

  it('restores default settings', () => {
    page.form.patchValue({ maxConcurrency: 9 });

    element.querySelector<HTMLButtonElement>('.data-actions button:first-child')!.click();

    expect(settings.settings()).toEqual(DEFAULT_SIMULATION_SETTINGS);
  });
});
