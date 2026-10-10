import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  InjectionToken,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  ChartData,
  ChartOptions,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

// Register only what the dashboard uses, keeping the deferred chunk small.
Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
);

export type ChartKind = 'bar' | 'line';

/** The subset of a Chart.js instance the wrapper relies on. */
export type ChartInstance = Pick<Chart<ChartKind>, 'data' | 'options' | 'update' | 'destroy'>;

export type ChartFactory = (
  canvas: HTMLCanvasElement,
  config: ChartConfiguration<ChartKind>,
) => ChartInstance;

/** Creates Chart.js instances; replaceable in tests (jsdom has no canvas). */
export const CHART_FACTORY = new InjectionToken<ChartFactory>('CHART_FACTORY', {
  providedIn: 'root',
  factory: () => (canvas, config) => new Chart(canvas, config),
});

/**
 * Thin Chart.js wrapper. The chart instance is created once; later input
 * changes are applied in place (labels, dataset values, options) followed by
 * `update()`, so Chart.js animates transitions instead of redrawing from scratch.
 */
@Component({
  selector: 'app-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas role="img" [attr.aria-label]="label()"></canvas>`,
  styles: `
    :host {
      position: relative;
      display: block;
      height: var(--chart-height, 220px);
    }
  `,
})
export class ChartView {
  readonly type = input.required<ChartKind>();
  readonly data = input.required<ChartData<ChartKind>>();
  readonly options = input<ChartOptions<ChartKind>>({});
  /** Accessible summary of what the chart shows. */
  readonly label = input.required<string>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly createChart = inject(CHART_FACTORY);
  private chart: ChartInstance | undefined;

  constructor() {
    afterRenderEffect({
      write: () => {
        const data = this.data();
        const options = this.options();
        if (this.chart) {
          this.sync(this.chart, data, options);
        } else {
          this.chart = this.createChart(this.canvas().nativeElement, {
            type: untracked(this.type),
            data,
            options,
          });
        }
      },
    });

    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
  }

  private sync(chart: ChartInstance, data: ChartData<ChartKind>, options: ChartOptions<ChartKind>) {
    chart.data.labels = data.labels;
    data.datasets.forEach((dataset, index) => {
      const current = chart.data.datasets[index];
      if (current) {
        Object.assign(current, dataset);
      } else {
        chart.data.datasets.push(dataset);
      }
    });
    chart.data.datasets.length = data.datasets.length;
    chart.options = options;
    chart.update();
  }
}
