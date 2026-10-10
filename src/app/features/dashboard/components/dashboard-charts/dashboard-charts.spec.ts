import { TestBed } from '@angular/core/testing';
import { ChartConfiguration } from 'chart.js';

import { CHART_FACTORY, ChartInstance, ChartKind } from '../../../../shared/components/chart/chart';
import { TaskStore } from '../../../tasks/store/task.store';
import { DashboardCharts } from './dashboard-charts';

describe('DashboardCharts', () => {
  let instances: ChartInstance[];

  beforeEach(() => {
    instances = [];
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
            instances.push(instance);
            return instance;
          },
        },
      ],
    });
  });

  it('renders the five charts', () => {
    const fixture = TestBed.createComponent(DashboardCharts);
    fixture.detectChanges();

    const headings = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('app-chart-card h3'),
      (h3) => h3.textContent?.trim(),
    );
    expect(headings).toEqual([
      'Tarefas por estado',
      'Sucessos × falhas',
      'Concluídas ao longo do tempo',
      'Tempo médio de processamento',
      'Throughput por minuto',
    ]);
    expect(instances).toHaveLength(5);
  });

  it('reacts to state changes without recreating charts', () => {
    const fixture = TestBed.createComponent(DashboardCharts);
    fixture.detectChanges();
    const statusChart = instances[0];

    TestBed.inject(TaskStore).create({
      title: 'Nova',
      priority: 'HIGH',
      durationMs: 1000,
      failureProbability: 0,
    });
    fixture.detectChanges();

    expect(instances).toHaveLength(5);
    expect(statusChart.update).toHaveBeenCalled();
    expect(statusChart.data.datasets[0].data).toEqual([1, 0, 0, 0, 0]);
  });

  it('offers a table view for each chart', () => {
    const fixture = TestBed.createComponent(DashboardCharts);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('app-chart-card button')!.click();
    fixture.detectChanges();

    const rows = Array.from(element.querySelectorAll('table tbody tr'), (tr) =>
      Array.from(tr.querySelectorAll('td'), (td) => td.textContent?.trim()),
    );
    expect(rows[0]).toEqual(['Pendentes', '0']);
    expect(instances).toHaveLength(5);
  });
});
