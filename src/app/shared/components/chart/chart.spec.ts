import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ChartConfiguration, ChartData } from 'chart.js';

import { CHART_FACTORY, ChartInstance, ChartKind, ChartView } from './chart';

@Component({
  imports: [ChartView],
  template: `<app-chart type="bar" label="Teste" [data]="data()" [options]="options()" />`,
})
class Host {
  readonly data = signal<ChartData<ChartKind>>({
    labels: ['A', 'B'],
    datasets: [{ label: 'S1', data: [1, 2] }],
  });
  readonly options = signal({});
}

describe('ChartView', () => {
  let created: { config: ChartConfiguration<ChartKind>; instance: ChartInstance }[];

  beforeEach(() => {
    created = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CHART_FACTORY,
          useValue: (_canvas: HTMLCanvasElement, config: ChartConfiguration<ChartKind>) => {
            const instance = {
              data: config.data,
              options: config.options ?? {},
              update: vi.fn(),
              destroy: vi.fn(),
            } as unknown as ChartInstance;
            created.push({ config, instance });
            return instance;
          },
        },
      ],
    });
  });

  it('creates the chart once with the initial data', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    expect(created).toHaveLength(1);
    expect(created[0].config.type).toBe('bar');
    expect(created[0].config.data.labels).toEqual(['A', 'B']);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('canvas')?.getAttribute('aria-label'),
    ).toBe('Teste');
  });

  it('updates the existing instance in place instead of recreating it', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const { instance } = created[0];
    const firstDataset = instance.data.datasets[0];

    fixture.componentInstance.data.set({
      labels: ['A', 'B', 'C'],
      datasets: [
        { label: 'S1', data: [3, 4, 5] },
        { label: 'S2', data: [1, 1, 1] },
      ],
    });
    fixture.detectChanges();

    expect(created).toHaveLength(1);
    expect(instance.update).toHaveBeenCalledTimes(1);
    expect(instance.data.labels).toEqual(['A', 'B', 'C']);
    expect(instance.data.datasets).toHaveLength(2);
    // Same dataset object, mutated: Chart.js animates from the previous values.
    expect(instance.data.datasets[0]).toBe(firstDataset);
    expect(instance.data.datasets[0].data).toEqual([3, 4, 5]);
  });

  it('drops datasets that disappeared', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    fixture.componentInstance.data.set({ labels: [], datasets: [] });
    fixture.detectChanges();

    expect(created[0].instance.data.datasets).toEqual([]);
  });

  it('destroys the chart with the component', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    fixture.destroy();

    expect(created[0].instance.destroy).toHaveBeenCalled();
  });
});
