import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: 'default' | 'danger';
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

/** Promise-based confirmation backed by a single dialog rendered in the shell. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly _pending = signal<PendingConfirm | null>(null);

  readonly pending = this._pending.asReadonly();

  confirm(options: ConfirmOptions): Promise<boolean> {
    this._pending()?.resolve(false);
    return new Promise((resolve) => this._pending.set({ ...options, resolve }));
  }

  settle(confirmed: boolean): void {
    const pending = this._pending();
    if (!pending) {
      return;
    }
    this._pending.set(null);
    pending.resolve(confirmed);
  }
}
