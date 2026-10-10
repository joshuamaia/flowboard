import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastKind, ToastService } from '../../../core/services/toast.service';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

const KIND_ICON: Readonly<Record<ToastKind, IconName>> = {
  success: 'check',
  error: 'alert',
  info: 'info',
};

@Component({
  selector: 'app-toast-container',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol role="status" aria-live="polite">
      @for (toast of toasts(); track toast.id) {
        <li class="toast" [attr.data-kind]="toast.kind">
          <app-icon [name]="kindIcon[toast.kind]" />
          <span class="message">{{ toast.message }}</span>
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            aria-label="Dispensar notificação"
            (click)="dismiss(toast.id)"
          >
            <app-icon name="close" [size]="16" />
          </button>
        </li>
      }
    </ol>
  `,
  styleUrl: './toast-container.scss',
})
export class ToastContainer {
  private readonly toastService = inject(ToastService);

  protected readonly toasts = this.toastService.toasts;
  protected readonly kindIcon = KIND_ICON;

  protected dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
