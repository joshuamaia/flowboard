import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TaskStatusBadge } from '../../../tasks/components/task-badges/task-status-badge';
import { EVENT_TYPE_LABELS } from '../../../tasks/models/task-labels';
import { TaskEvent } from '../../../tasks/models/task-event.model';

@Component({
  selector: 'app-event-list',
  imports: [DatePipe, TaskStatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './event-list.html',
  styleUrl: './event-list.scss',
})
export class EventList {
  readonly events = input.required<readonly TaskEvent[]>();
  /** Compact mode hides the status transition column (used on the dashboard). */
  readonly compact = input(false);

  protected readonly typeLabels = EVENT_TYPE_LABELS;
}
