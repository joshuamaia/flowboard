import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

@Component({
  selector: 'app-empty-state',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="icon-wrap">
      <app-icon [name]="icon()" [size]="28" [strokeWidth]="1.75" />
    </div>
    <h2 class="title">{{ heading() }}</h2>
    @if (message()) {
      <p class="message">{{ message() }}</p>
    }
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 3rem 1.5rem;
      text-align: center;
    }

    .icon-wrap {
      display: grid;
      place-items: center;
      width: 3.5rem;
      height: 3.5rem;
      margin-bottom: 0.5rem;
      border-radius: 50%;
      background: color-mix(in srgb, var(--fb-primary) 12%, transparent);
      color: var(--fb-primary);
    }

    .title {
      font-size: 1rem;
    }

    .message {
      max-width: 42ch;
      color: var(--fb-text-muted);
      font-size: 0.875rem;
    }

    .actions:not(:empty) {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 1rem;
    }
  `,
})
export class EmptyState {
  readonly icon = input<IconName>('inbox');
  readonly heading = input.required<string>();
  readonly message = input<string>();
}
