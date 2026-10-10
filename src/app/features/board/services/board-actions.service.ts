import { inject, Injectable } from '@angular/core';

import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { ProcessingEngineService } from '../../simulation/engine/processing-engine.service';
import { TaskCardAction } from '../../tasks/components/task-card/task-card';
import { TaskStore } from '../../tasks/store/task.store';
import { BoardColumnId } from '../models/board-columns';
import { resolveManualMove } from '../models/board-moves';

/** Applies user actions coming from the board (drag & drop or card buttons). */
@Injectable({ providedIn: 'root' })
export class BoardActionsService {
  private readonly store = inject(TaskStore);
  private readonly engine = inject(ProcessingEngineService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  /** Validates a drop against the current task state, not the dragged snapshot. */
  moveTo(taskId: string, target: BoardColumnId): void {
    const task = this.store.getById(taskId);
    if (!task) {
      return;
    }

    const move = resolveManualMove(task, target);
    if (!move) {
      this.toast.error(`Movimento não permitido para ${task.id}.`);
      return;
    }
    void this.run(taskId, move);
  }

  async run(taskId: string, action: TaskCardAction): Promise<void> {
    switch (action) {
      case 'REQUEUE':
        if (this.engine.requeue(taskId)) {
          this.toast.success(`${taskId} reenviada para a fila.`);
        }
        return;
      case 'INTERRUPT':
        if (this.engine.interrupt(taskId)) {
          this.toast.show(`${taskId} interrompida e devolvida à fila.`);
        }
        return;
      case 'DELETE': {
        const confirmed = await this.confirm.confirm({
          title: `Excluir ${taskId}?`,
          message:
            'A tarefa será removida do quadro. Os eventos já registrados continuam no histórico.',
          confirmLabel: 'Excluir',
          tone: 'danger',
        });
        if (confirmed && this.store.remove(taskId)) {
          this.toast.show(`${taskId} excluída.`);
        }
        return;
      }
    }
  }
}
