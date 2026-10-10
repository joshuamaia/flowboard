import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Icon } from '../../../../shared/components/icon/icon';
import { IconName } from '../../../../shared/components/icon/icons';

export type MetricTone = 'neutral' | 'primary' | 'warning' | 'success' | 'danger' | 'info';

@Component({
  selector: 'app-metric-card',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-tone]': 'tone()', '[attr.title]': 'tooltip() ?? null' },
  template: `
    <div class="top">
      <span class="label">{{ label() }}</span>
      <span class="icon"><app-icon [name]="icon()" [size]="16" /></span>
    </div>
    <span class="value mono">{{ value() }}</span>
    @if (hint()) {
      <span class="hint">{{ hint() }}</span>
    }
  `,
  styleUrl: './metric-card.scss',
})
export class MetricCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly icon = input.required<IconName>();
  readonly tone = input<MetricTone>('neutral');
  readonly hint = input<string>();
  readonly tooltip = input<string>();
}
