import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

export interface ChartTable {
  headers: readonly string[];
  rows: readonly (readonly string[])[];
}

/**
 * Card around a chart with a table-view twin. The chart stays mounted while the
 * table is shown, so toggling never recreates the Chart.js instance.
 */
@Component({
  selector: 'app-chart-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chart-card.html',
  styleUrl: './chart-card.scss',
})
export class ChartCard {
  readonly heading = input.required<string>();
  readonly description = input<string>();
  readonly table = input.required<ChartTable>();

  protected readonly showTable = signal(false);

  protected toggle(): void {
    this.showTable.update((show) => !show);
  }
}
