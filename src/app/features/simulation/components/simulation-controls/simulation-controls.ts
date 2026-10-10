import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ToastService } from '../../../../core/services/toast.service';
import { Icon } from '../../../../shared/components/icon/icon';
import { ProcessingEngineService } from '../../engine/processing-engine.service';
import { SIMULATION_STATUS_LABELS } from '../../models/simulation-status.model';

@Component({
  selector: 'app-simulation-controls',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './simulation-controls.html',
  styleUrl: './simulation-controls.scss',
})
export class SimulationControls {
  private readonly engine = inject(ProcessingEngineService);
  private readonly toast = inject(ToastService);

  protected readonly status = this.engine.status;
  protected readonly activeCount = this.engine.activeCount;
  protected readonly capacity = this.engine.capacity;
  protected readonly statusLabel = computed(() => SIMULATION_STATUS_LABELS[this.status()]);

  protected start(): void {
    this.engine.start();
  }

  protected pause(): void {
    this.engine.pause();
  }

  protected resume(): void {
    this.engine.resume();
  }

  protected stop(): void {
    const interrupted = this.engine.stop();
    this.toast.show(
      interrupted > 0
        ? `Simulação interrompida. ${interrupted} tarefa(s) devolvida(s) à fila.`
        : 'Simulação interrompida.',
    );
  }
}
