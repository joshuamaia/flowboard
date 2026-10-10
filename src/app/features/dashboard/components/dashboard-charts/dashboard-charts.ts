import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ChartData } from 'chart.js';

import { NowService } from '../../../../core/services/now.service';
import { jsonEqual } from '../../../../core/utils/equality';
import { baseChartOptions, withAlpha } from '../../../../shared/components/chart/chart-options';
import { ChartPaletteService } from '../../../../shared/components/chart/chart-palette.service';
import { ChartView } from '../../../../shared/components/chart/chart';
import { formatDuration } from '../../../../shared/pipes/duration.pipe';
import { MetricsService } from '../../../simulation/services/metrics.service';
import { EventLogStore } from '../../../tasks/store/event-log.store';
import { TaskStore } from '../../../tasks/store/task.store';
import { buildThroughput, buildTimeSeries } from '../../charts/chart-series';
import { ChartCard, ChartTable } from '../chart-card/chart-card';

const clock = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
const clockMinutes = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Mark specs: thin bars with 4px rounded data-ends, 2px lines, 8px hover markers. */
const BAR = { borderRadius: 4, borderSkipped: 'start', maxBarThickness: 24 } as const;
const LINE = {
  borderWidth: 2,
  pointRadius: 0,
  pointHoverRadius: 4,
  pointHoverBorderWidth: 2,
  tension: 0,
} as const;

@Component({
  selector: 'app-dashboard-charts',
  imports: [ChartCard, ChartView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-charts.html',
  styleUrl: './dashboard-charts.scss',
})
export class DashboardCharts {
  private readonly palette = inject(ChartPaletteService).palette;
  private readonly metrics = inject(MetricsService).metrics;
  private readonly events = inject(EventLogStore).events;
  private readonly tasks = inject(TaskStore).tasks;
  private readonly now = inject(NowService).now;

  // Series are recomputed every tick but only propagate when the numbers change.
  private readonly series = computed(
    () => buildTimeSeries(this.events(), this.tasks(), this.now()),
    { equal: jsonEqual },
  );
  private readonly throughput = computed(() => buildThroughput(this.events(), this.now()), {
    equal: jsonEqual,
  });
  private readonly timeLabels = computed(() =>
    this.series().bucketStarts.map((start) => clock.format(start)),
  );

  // --- Tarefas por estado -------------------------------------------------
  private readonly statusRows = computed(
    () => {
      const m = this.metrics();
      return [
        { label: 'Pendentes', value: m.pending, color: 'pending' },
        { label: 'Processando', value: m.processing, color: 'processing' },
        { label: 'Aguardando retry', value: m.retrying, color: 'retrying' },
        { label: 'Concluídas', value: m.completed, color: 'completed' },
        { label: 'Falhas', value: m.failed, color: 'failed' },
      ] as const;
    },
    { equal: jsonEqual },
  );

  protected readonly statusData = computed<ChartData<'bar'>>(() => {
    const palette = this.palette();
    const rows = this.statusRows();
    return {
      labels: rows.map((row) => row.label),
      datasets: [
        {
          label: 'Tarefas',
          data: rows.map((row) => row.value),
          backgroundColor: rows.map((row) => palette[row.color]),
          ...BAR,
        },
      ],
    };
  });
  protected readonly statusOptions = computed(() =>
    baseChartOptions(this.palette(), { horizontal: true }),
  );
  protected readonly statusTable = computed<ChartTable>(() => ({
    headers: ['Estado', 'Tarefas'],
    rows: this.statusRows().map((row) => [row.label, String(row.value)]),
  }));

  // --- Concluídas ao longo do tempo ----------------------------------------
  protected readonly completedData = computed<ChartData<'line'>>(() => {
    const palette = this.palette();
    return {
      labels: this.timeLabels(),
      datasets: [
        {
          label: 'Concluídas',
          data: this.series().completedCumulative,
          borderColor: palette.primary,
          backgroundColor: withAlpha(palette.primary, 0.14),
          pointBackgroundColor: palette.primary,
          pointBorderColor: palette.surface,
          fill: 'origin',
          ...LINE,
        },
      ],
    };
  });
  protected readonly completedOptions = computed(() => baseChartOptions(this.palette()));
  protected readonly completedTable = computed<ChartTable>(() => ({
    headers: ['Horário', 'Concluídas (acumulado)'],
    rows: this.timeLabels().map((label, i) => [
      label,
      String(this.series().completedCumulative[i]),
    ]),
  }));

  // --- Sucessos × falhas --------------------------------------------------
  protected readonly outcomeData = computed<ChartData<'bar'>>(() => {
    const palette = this.palette();
    const series = this.series();
    return {
      labels: this.timeLabels(),
      datasets: [
        {
          label: 'Sucessos',
          data: series.successes,
          backgroundColor: palette.success,
          ...BAR,
        },
        { label: 'Falhas', data: series.failures, backgroundColor: palette.danger, ...BAR },
      ],
    };
  });
  protected readonly outcomeOptions = computed(() =>
    baseChartOptions(this.palette(), { legend: true }),
  );
  protected readonly outcomeTable = computed<ChartTable>(() => ({
    headers: ['Horário', 'Sucessos', 'Falhas'],
    rows: this.timeLabels()
      .map((label, i) => [
        label,
        String(this.series().successes[i]),
        String(this.series().failures[i]),
      ])
      .filter((row) => row[1] !== '0' || row[2] !== '0'),
  }));

  // --- Tempo médio de processamento ----------------------------------------
  protected readonly durationData = computed<ChartData<'line'>>(() => {
    const palette = this.palette();
    return {
      labels: this.timeLabels(),
      datasets: [
        {
          label: 'Tempo médio',
          data: this.series().averageProcessingMs,
          borderColor: palette.primary,
          backgroundColor: palette.primary,
          pointBackgroundColor: palette.primary,
          pointBorderColor: palette.surface,
          spanGaps: true,
          ...LINE,
          // Samples are sparse, so markers are always visible (8px + 2px surface ring).
          pointRadius: 4,
          pointBorderWidth: 2,
        },
      ],
    };
  });
  protected readonly durationOptions = computed(() =>
    baseChartOptions(this.palette(), { formatValue: formatDuration }),
  );
  protected readonly durationTable = computed<ChartTable>(() => ({
    headers: ['Horário', 'Tempo médio'],
    rows: this.timeLabels().flatMap((label, i) => {
      const value = this.series().averageProcessingMs[i];
      return value === null ? [] : [[label, formatDuration(value)]];
    }),
  }));

  // --- Throughput por minuto -----------------------------------------------
  private readonly minuteLabels = computed(() =>
    this.throughput().bucketStarts.map((start) => clockMinutes.format(start)),
  );
  protected readonly throughputData = computed<ChartData<'bar'>>(() => ({
    labels: this.minuteLabels(),
    datasets: [
      {
        label: 'Concluídas/min',
        data: this.throughput().completions,
        backgroundColor: this.palette().primary,
        ...BAR,
      },
    ],
  }));
  protected readonly throughputOptions = computed(() =>
    baseChartOptions(this.palette(), { maxCategoryTicks: 10 }),
  );
  protected readonly throughputTable = computed<ChartTable>(() => ({
    headers: ['Minuto', 'Concluídas'],
    rows: this.minuteLabels().map((label, i) => [label, String(this.throughput().completions[i])]),
  }));
}
