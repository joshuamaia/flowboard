import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';

import { Icon } from '../icon/icon';

let nextDialogId = 0;

/**
 * Modal built on the native <dialog> element: focus trapping, Esc to close,
 * inert background and top-layer rendering come from the platform.
 */
@Component({
  selector: 'app-dialog',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Backdrop click is a pointer shortcut; keyboard users close with the native Esc. -->
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
    <dialog
      #dialog
      [attr.aria-labelledby]="titleId"
      (close)="closed.emit()"
      (click)="onDialogClick($event)"
    >
      <div class="panel">
        <header>
          <h2 [id]="titleId">{{ title() }}</h2>
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            aria-label="Fechar"
            (click)="dialog.close()"
          >
            <app-icon name="close" />
          </button>
        </header>
        <ng-content />
      </div>
    </dialog>
  `,
  styleUrl: './dialog.scss',
})
export class Dialog {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly closed = output();

  protected readonly titleId = `app-dialog-title-${nextDialogId++}`;
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialogRef().nativeElement;
      if (this.open() && !dialog.open) {
        dialog.showModal();
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }

  /** Clicks that land on the <dialog> itself (not the panel) hit the backdrop. */
  protected onDialogClick(event: MouseEvent): void {
    const dialog = this.dialogRef().nativeElement;
    if (event.target === dialog) {
      dialog.close();
    }
  }
}
