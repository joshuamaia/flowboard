import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { ConfirmService } from '../../../../core/services/confirm.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Icon } from '../../../../shared/components/icon/icon';
import { TaskStore } from '../../../tasks/store/task.store';
import { DemoScenarioService } from '../../services/demo-scenario.service';

/** "Gerar cenário de demonstração" — asks before replacing an existing queue. */
@Component({
  selector: 'app-demo-scenario-button',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" [class]="'btn ' + variant()" (click)="generate()">
      <app-icon name="zap" [size]="16" />
      {{ label() }}
    </button>
  `,
})
export class DemoScenarioButton {
  private readonly demo = inject(DemoScenarioService);
  private readonly tasks = inject(TaskStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  /** Fixed seed for a reproducible scenario; null generates a random one. */
  readonly seed = input<number | null>(null);
  readonly variant = input<'btn-primary' | 'btn-secondary'>('btn-secondary');
  readonly customLabel = input<string>();

  protected readonly label = computed(
    () =>
      this.customLabel() ??
      (this.seed() === null
        ? 'Gerar cenário de demonstração'
        : `Gerar cenário (seed ${this.seed()})`),
  );

  protected async generate(): Promise<void> {
    if (this.tasks.count() > 0) {
      const confirmed = await this.confirm.confirm({
        title: 'Substituir as tarefas atuais?',
        message:
          'O cenário de demonstração interrompe a simulação e substitui todas as tarefas e o histórico.',
        confirmLabel: 'Gerar cenário',
        tone: 'danger',
      });
      if (!confirmed) {
        return;
      }
    }

    const seed = this.seed();
    const count = this.demo.generate(seed);
    this.toast.success(
      seed === null
        ? `Cenário gerado com ${count} tarefas. Clique em Iniciar.`
        : `Cenário reproduzível (seed ${seed}) gerado com ${count} tarefas. Clique em Iniciar.`,
    );
  }
}
