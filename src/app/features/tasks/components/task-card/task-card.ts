import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Icon } from '../../../../shared/components/icon/icon';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';
import { Execution } from '../../../simulation/models/simulation-status.model';
import { Task } from '../../models/task.model';
import { processingTimeMs } from '../../models/task.utils';
import { TaskPriorityBadge } from '../task-badges/task-priority-badge';
import { TaskStatusBadge } from '../task-badges/task-status-badge';

export type TaskCardAction = 'REQUEUE' | 'INTERRUPT' | 'DELETE';

interface ProgressView {
  phase: 'PROCESSING' | 'BACKOFF';
  /** Completed fraction when the current timer segment started. */
  from: number;
  /** Wall-clock ms to reach 100% (0 when not ticking). */
  durationMs: number;
  running: boolean;
  /** Changes whenever the segment restarts, recreating the animated element. */
  key: string;
}

@Component({
  selector: 'app-task-card',
  imports: [DatePipe, DurationPipe, Icon, RouterLink, TaskPriorityBadge, TaskStatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-status]': 'task().status' },
  templateUrl: './task-card.html',
  styleUrl: './task-card.scss',
})
export class TaskCard {
  readonly task = input.required<Task>();
  readonly execution = input<Execution>();
  /** Whether the simulation is paused, freezing progress animations. */
  readonly paused = input(false);
  readonly action = output<TaskCardAction>();

  protected readonly processingTime = computed(() => processingTimeMs(this.task()));

  protected readonly waitingForWorker = computed(() => this.execution()?.phase === 'READY');

  protected readonly progress = computed<ProgressView | null>(() => {
    const execution = this.execution();
    if (!execution || execution.phase === 'READY') {
      return null;
    }
    const running = execution.resumedAt !== null && !this.paused();
    return {
      phase: execution.phase,
      from: execution.totalMs > 0 ? 1 - execution.remainingMs / execution.totalMs : 1,
      durationMs: running ? execution.remainingMs / execution.speed : 0,
      running,
      key: `${execution.phase}:${execution.resumedAt}:${execution.remainingMs}:${running}`,
    };
  });

  protected readonly actions = computed<readonly TaskCardAction[]>(() => {
    switch (this.task().status) {
      case 'FAILED':
        return ['REQUEUE', 'DELETE'];
      case 'PROCESSING':
      case 'RETRYING':
        return ['INTERRUPT'];
      default:
        return ['DELETE'];
    }
  });
}
