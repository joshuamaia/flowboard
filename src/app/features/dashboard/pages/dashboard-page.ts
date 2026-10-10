import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Icon } from '../../../shared/components/icon/icon';
import { IconName } from '../../../shared/components/icon/icons';
import { formatDuration } from '../../../shared/pipes/duration.pipe';
import { EventList } from '../../history/components/event-list/event-list';
import { DemoScenarioButton } from '../../simulation/components/demo-scenario-button/demo-scenario-button';
import { MetricsService } from '../../simulation/services/metrics.service';
import { TaskDialogService } from '../../tasks/services/task-dialog.service';
import { EventLogStore } from '../../tasks/store/event-log.store';
import { DashboardCharts } from '../components/dashboard-charts/dashboard-charts';
import { MetricCard, MetricTone } from '../components/metric-card/metric-card';

const RECENT_EVENTS = 8;

interface MetricView {
  id: string;
  label: string;
  value: string;
  icon: IconName;
  tone: MetricTone;
  hint?: string;
  tooltip: string;
}

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

@Component({
  selector: 'app-dashboard-page',
  imports: [
    DashboardCharts,
    DemoScenarioButton,
    EmptyState,
    EventList,
    Icon,
    MetricCard,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  private readonly dialog = inject(TaskDialogService);
  private readonly metrics = inject(MetricsService).metrics;
  private readonly eventLog = inject(EventLogStore);

  protected readonly hasTasks = computed(() => this.metrics().total > 0);
  protected readonly chartSlots = [1, 2, 3, 4, 5];

  protected readonly recentEvents = computed(() =>
    this.eventLog.events().slice(-RECENT_EVENTS).reverse(),
  );

  protected readonly cards = computed<MetricView[]>(() => {
    const m = this.metrics();
    return [
      {
        id: 'total',
        label: 'Total de tarefas',
        value: String(m.total),
        icon: 'layers',
        tone: 'neutral',
        tooltip: 'Todas as tarefas atualmente no quadro',
      },
      {
        id: 'pending',
        label: 'Pendentes',
        value: String(m.pending),
        icon: 'clock',
        tone: 'primary',
        tooltip: 'Aguardando um worker livre',
      },
      {
        id: 'processing',
        label: 'Em processamento',
        value: String(m.processing),
        icon: 'activity',
        tone: 'warning',
        hint: m.retrying > 0 ? `+${m.retrying} aguardando retry` : undefined,
        tooltip: 'Tentativas em execução agora',
      },
      {
        id: 'completed',
        label: 'Concluídas',
        value: String(m.completed),
        icon: 'check',
        tone: 'success',
        tooltip: 'Tarefas finalizadas com sucesso',
      },
      {
        id: 'failed',
        label: 'Com erro',
        value: String(m.failed),
        icon: 'alert',
        tone: 'danger',
        tooltip: 'Falharam após esgotar as tentativas',
      },
      {
        id: 'success',
        label: 'Taxa de sucesso',
        value: m.successRate === null ? '—' : percent.format(m.successRate),
        icon: 'gauge',
        tone: 'success',
        tooltip: 'Concluídas ÷ (concluídas + falhas definitivas)',
      },
      {
        id: 'avg',
        label: 'Tempo médio',
        value: m.averageProcessingMs === null ? '—' : formatDuration(m.averageProcessingMs),
        icon: 'clock',
        tone: 'info',
        tooltip: 'Duração média da tentativa final das tarefas concluídas',
      },
      {
        id: 'throughput',
        label: 'Throughput',
        value: String(m.throughputPerMinute),
        icon: 'zap',
        tone: 'primary',
        hint: 'tarefas/min',
        tooltip: 'Tarefas concluídas nos últimos 60 segundos',
      },
    ];
  });

  protected openDialog(): void {
    this.dialog.open();
  }
}
