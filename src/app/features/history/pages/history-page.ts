import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';

import { NowService } from '../../../core/services/now.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Icon } from '../../../shared/components/icon/icon';
import { EVENT_TYPE_LABELS } from '../../tasks/models/task-labels';
import { TASK_EVENT_TYPES, TaskEventType } from '../../tasks/models/task-event.model';
import { EventLogStore } from '../../tasks/store/event-log.store';
import { EventList } from '../components/event-list/event-list';
import { EVENT_PERIODS, EventPeriod, filterEvents } from '../models/event-filters';

const PAGE_SIZE = 100;

@Component({
  selector: 'app-history-page',
  imports: [EmptyState, EventList, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './history-page.html',
  styleUrl: './history-page.scss',
})
export class HistoryPage {
  private readonly eventLog = inject(EventLogStore);
  private readonly now = inject(NowService).now;

  /** Bound from the `?task=` query param (e.g. the card's history link). */
  readonly task = input<string>();

  protected readonly taskFilter = linkedSignal(() => this.task() ?? '');
  protected readonly typeFilter = signal<TaskEventType | ''>('');
  protected readonly periodFilter = signal<EventPeriod>('ALL');
  protected readonly limit = linkedSignal({
    source: () => [this.taskFilter(), this.typeFilter(), this.periodFilter()],
    computation: () => PAGE_SIZE,
  });

  protected readonly periods = EVENT_PERIODS;
  protected readonly types = TASK_EVENT_TYPES;
  protected readonly typeLabels = EVENT_TYPE_LABELS;

  protected readonly totalEvents = computed(() => this.eventLog.events().length);
  protected readonly taskIds = computed(() =>
    [...new Set(this.eventLog.events().map((event) => event.taskId))].sort(),
  );

  protected readonly filtered = computed(() =>
    filterEvents(
      this.eventLog.events(),
      { taskId: this.taskFilter(), type: this.typeFilter(), period: this.periodFilter() },
      this.now(),
    ),
  );
  protected readonly visible = computed(() => this.filtered().slice(0, this.limit()));
  protected readonly hasFilters = computed(
    () => !!this.taskFilter() || !!this.typeFilter() || this.periodFilter() !== 'ALL',
  );

  protected onTaskChange(event: Event): void {
    this.taskFilter.set((event.target as HTMLSelectElement).value);
  }

  protected onTypeChange(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value as TaskEventType | '');
  }

  protected onPeriodChange(event: Event): void {
    this.periodFilter.set((event.target as HTMLSelectElement).value as EventPeriod);
  }

  protected clearFilters(): void {
    this.taskFilter.set('');
    this.typeFilter.set('');
    this.periodFilter.set('ALL');
  }

  protected showMore(): void {
    this.limit.update((limit) => limit + PAGE_SIZE);
  }
}
