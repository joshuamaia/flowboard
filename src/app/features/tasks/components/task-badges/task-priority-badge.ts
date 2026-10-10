import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PRIORITY_LABELS } from '../../models/task-labels';
import { TaskPriority } from '../../models/task.model';

@Component({
  selector: 'app-task-priority-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-priority]': 'priority()' },
  template: `<span class="sr-only">Prioridade </span>{{ label() }}`,
  styleUrl: './task-badge.scss',
})
export class TaskPriorityBadge {
  readonly priority = input.required<TaskPriority>();

  protected readonly label = computed(() => PRIORITY_LABELS[this.priority()]);
}
