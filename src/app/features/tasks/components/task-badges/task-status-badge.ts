import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { STATUS_LABELS } from '../../models/task-labels';
import { TaskStatus } from '../../models/task.model';

@Component({
  selector: 'app-task-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-status]': 'status()' },
  template: `<span class="dot" aria-hidden="true"></span>{{ label() }}`,
  styleUrl: './task-badge.scss',
})
export class TaskStatusBadge {
  readonly status = input.required<TaskStatus>();

  protected readonly label = computed(() => STATUS_LABELS[this.status()]);
}
