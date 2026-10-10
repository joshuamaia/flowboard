import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService } from '../../../../core/services/toast.service';
import { Dialog } from '../../../../shared/components/dialog/dialog';
import { NewTaskInput } from '../../models/task.model';
import { TaskDialogService } from '../../services/task-dialog.service';
import { TaskStore } from '../../store/task.store';
import { TaskForm } from '../task-form/task-form';

@Component({
  selector: 'app-task-create-dialog',
  imports: [Dialog, TaskForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog title="Nova tarefa" [open]="dialog.isOpen()" (closed)="dialog.close()">
      @if (dialog.isOpen()) {
        <app-task-form (submitted)="create($event)" (cancelled)="dialog.close()" />
      }
    </app-dialog>
  `,
})
export class TaskCreateDialog {
  private readonly store = inject(TaskStore);
  private readonly toast = inject(ToastService);

  protected readonly dialog = inject(TaskDialogService);

  protected create(input: NewTaskInput): void {
    const task = this.store.create(input);
    this.toast.success(`${task.id} criada e adicionada à fila.`);
    this.dialog.close();
  }
}
