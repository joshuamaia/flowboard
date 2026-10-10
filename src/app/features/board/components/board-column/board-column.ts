import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Execution } from '../../../simulation/models/simulation-status.model';
import { TaskCard, TaskCardAction } from '../../../tasks/components/task-card/task-card';
import { Task } from '../../../tasks/models/task.model';
import { BoardColumnDef, BoardColumnId } from '../../models/board-columns';
import { canBeDragged, resolveManualMove } from '../../models/board-moves';

export interface BoardItem {
  task: Task;
  execution?: Execution;
}

export interface BoardCardAction {
  taskId: string;
  action: TaskCardAction;
}

@Component({
  selector: 'app-board-column',
  imports: [CdkDropList, CdkDrag, CdkDragPlaceholder, TaskCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-column]': 'column().id' },
  templateUrl: './board-column.html',
  styleUrl: './board-column.scss',
})
export class BoardColumn {
  readonly column = input.required<BoardColumnDef>();
  readonly items = input.required<readonly BoardItem[]>();
  readonly paused = input(false);
  /** Optional extra info shown next to the counter (e.g. worker usage). */
  readonly caption = input<string>();

  readonly dropped = output<{ taskId: string; target: BoardColumnId }>();
  readonly cardAction = output<BoardCardAction>();

  protected readonly canDrag = canBeDragged;

  /** Only columns that represent a valid manual move light up while dragging. */
  protected readonly canEnter = (drag: CdkDrag<Task>, drop: CdkDropList<BoardColumnId>): boolean =>
    resolveManualMove(drag.data, drop.data) !== null;

  protected onDrop(event: CdkDragDrop<BoardColumnId, BoardColumnId, Task>): void {
    if (event.previousContainer !== event.container) {
      this.dropped.emit({ taskId: event.item.data.id, target: event.container.data });
    }
  }
}
