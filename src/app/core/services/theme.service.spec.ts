import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let root: HTMLElement;

  beforeEach(() => {
    service = TestBed.inject(ThemeService);
    root = TestBed.inject(DOCUMENT).documentElement;
  });

  it('uses the dark theme by default', () => {
    TestBed.tick();

    expect(service.theme()).toBe('dark');
    expect(root.dataset['theme']).toBe('dark');
  });

  it('toggles between dark and light and reflects it on <html>', () => {
    service.toggle();
    TestBed.tick();
    expect(service.theme()).toBe('light');
    expect(root.dataset['theme']).toBe('light');

    service.toggle();
    TestBed.tick();
    expect(root.dataset['theme']).toBe('dark');
  });

  it('sets an explicit theme', () => {
    service.setTheme('light');
    TestBed.tick();

    expect(root.dataset['theme']).toBe('light');
  });
});
