import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const DEFAULT_DURATION_MS = 4000;
const MAX_VISIBLE = 4;

/** Transient notifications. Owns its own timers so components never schedule any. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<readonly Toast[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 1;

  readonly toasts = this._toasts.asReadonly();

  show(message: string, kind: ToastKind = 'info', durationMs = DEFAULT_DURATION_MS): number {
    const toast: Toast = { id: this.nextId++, kind, message };
    this._toasts.update((toasts) => [...toasts, toast].slice(-MAX_VISIBLE));
    this.timers.set(
      toast.id,
      setTimeout(() => this.dismiss(toast.id), durationMs),
    );
    return toast.id;
  }

  success(message: string): number {
    return this.show(message, 'success');
  }

  error(message: string): number {
    return this.show(message, 'error');
  }

  dismiss(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this._toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }
}
