import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { Title } from '@angular/platform-browser';

import { App } from './app';
import { routes } from './app.routes';
import { PageTitleStrategy } from './core/services/page-title.strategy';

describe('App shell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: TitleStrategy, useExisting: PageTitleStrategy },
      ],
    }).compileComponents();
  });

  it('renders the main navigation links', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('nav a'),
      (link) => link.textContent?.trim(),
    );

    expect(labels).toEqual(['Dashboard', 'Quadro', 'Histórico', 'Configurações']);
  });

  it('redirects to the dashboard and updates header and document title', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(element.querySelector('app-header h1')?.textContent).toBe('Dashboard');
    expect(TestBed.inject(Title).getTitle()).toBe('Dashboard · FlowBoard');
  });

  it('lazy loads a feature route and marks its link as active', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/history');
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-history-page')).not.toBeNull();
    expect(element.querySelector('a[aria-current="page"]')?.textContent?.trim()).toBe('Histórico');
  });
});
