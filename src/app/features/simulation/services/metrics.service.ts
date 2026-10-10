import { computed, inject, Injectable } from '@angular/core';

import { NowService } from '../../../core/services/now.service';
import { TaskStore } from '../../tasks/store/task.store';
import { computeMetrics } from '../metrics/compute-metrics';

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private readonly store = inject(TaskStore);
  private readonly now = inject(NowService).now;

  readonly metrics = computed(() => computeMetrics(this.store.tasks(), this.now()));
}
