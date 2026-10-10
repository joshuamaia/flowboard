import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ConfirmService } from '../../../core/services/confirm.service';
import { Dialog } from '../dialog/dialog';

@Component({
  selector: 'app-confirm-dialog',
  imports: [Dialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let request = pending();
    <app-dialog [title]="request?.title ?? ''" [open]="!!request" (closed)="settle(false)">
      @if (request) {
        <p class="message">{{ request.message }}</p>
        <footer>
          <button type="button" class="btn btn-secondary" (click)="settle(false)">Cancelar</button>
          <button
            type="button"
            class="btn"
            [class.btn-primary]="request.tone !== 'danger'"
            [class.btn-danger]="request.tone === 'danger'"
            (click)="settle(true)"
          >
            {{ request.confirmLabel ?? 'Confirmar' }}
          </button>
        </footer>
      }
    </app-dialog>
  `,
  styles: `
    .message {
      color: var(--fb-text-muted);
    }

    footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1.5rem;
    }
  `,
})
export class ConfirmDialog {
  private readonly confirmService = inject(ConfirmService);

  protected readonly pending = computed(() => this.confirmService.pending());

  protected settle(confirmed: boolean): void {
    this.confirmService.settle(confirmed);
  }
}
