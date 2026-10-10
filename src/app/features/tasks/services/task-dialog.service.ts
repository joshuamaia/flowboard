import { Injectable, signal } from '@angular/core';

/** Lets any part of the UI open the "new task" dialog rendered once in the shell. */
@Injectable({ providedIn: 'root' })
export class TaskDialogService {
  private readonly _isOpen = signal(false);

  readonly isOpen = this._isOpen.asReadonly();

  open(): void {
    this._isOpen.set(true);
  }

  close(): void {
    this._isOpen.set(false);
  }
}
