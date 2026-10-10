import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Icon } from '../../../shared/components/icon/icon';
import { DemoScenarioButton } from '../../simulation/components/demo-scenario-button/demo-scenario-button';
import { compareForDispatch } from '../../simulation/engine/task-selection';
import { ProcessingEngineService } from '../../simulation/engine/processing-engine.service';
import { Task } from '../../tasks/models/task.model';
import { TaskDialogService } from '../../tasks/services/task-dialog.service';
import { TaskStore } from '../../tasks/store/task.store';
import { BoardCardAction, BoardColumn, BoardItem } from '../components/board-column/board-column';
import { BOARD_COLUMNS, BoardColumnDef, BoardColumnId } from '../models/board-columns';
import { BoardActionsService } from '../services/board-actions.service';

const byStartedAt = (a: Task, b: Task) => (a.startedAt ?? '').localeCompare(b.startedAt ?? '');
const byCompletedDesc = (a: Task, b: Task) =>
  (b.completedAt ?? '').localeCompare(a.completedAt ?? '');

/** How each column orders its cards. Pending shows the actual dispatch order. */
const COLUMN_ORDER: Readonly<Record<BoardColumnId, (a: Task, b: Task) => number>> = {
  pending: compareForDispatch,
  processing: byStartedAt,
  completed: byCompletedDesc,
  failed: byCompletedDesc,
};

interface ColumnView {
  def: BoardColumnDef;
  items: BoardItem[];
}

@Component({
  selector: 'app-board-page',
  imports: [CdkDropListGroup, BoardColumn, DemoScenarioButton, EmptyState, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './board-page.html',
  styleUrl: './board-page.scss',
})
export class BoardPage {
  private readonly store = inject(TaskStore);
  private readonly engine = inject(ProcessingEngineService);
  private readonly dialog = inject(TaskDialogService);
  private readonly actions = inject(BoardActionsService);

  protected readonly hasTasks = computed(() => this.store.count() > 0);
  protected readonly paused = computed(() => this.engine.status() === 'PAUSED');
  protected readonly workersCaption = computed(
    () => `${this.engine.activeCount()}/${this.engine.capacity()} workers`,
  );

  protected readonly columns = computed<ColumnView[]>(() => {
    const byStatus = this.store.tasksByStatus();
    return BOARD_COLUMNS.map((def) => ({
      def,
      items: def.statuses
        .flatMap((status) => byStatus[status])
        .sort(COLUMN_ORDER[def.id])
        .map((task) => ({ task, execution: this.engine.executionOf(task.id) })),
    }));
  });

  protected openDialog(): void {
    this.dialog.open();
  }

  protected onDropped(event: { taskId: string; target: BoardColumnId }): void {
    this.actions.moveTo(event.taskId, event.target);
  }

  protected onCardAction({ taskId, action }: BoardCardAction): void {
    void this.actions.run(taskId, action);
  }
}
