import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { PRIORITY_LABELS } from '../../models/task-labels';
import { TASK_PRIORITIES, TaskPriority } from '../../models/task.model';

/** Segmented radio group for task priority. Arrow keys work natively. */
@Component({
  selector: 'app-priority-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PrioritySelector), multi: true },
  ],
  template: `
    <fieldset>
      <legend>{{ legend() }}</legend>
      <div class="options">
        @for (priority of priorities; track priority) {
          <label class="option" [attr.data-priority]="priority">
            <input
              type="radio"
              [name]="name()"
              [value]="priority"
              [checked]="value() === priority"
              [disabled]="disabled()"
              (change)="select(priority)"
              (blur)="onTouched()"
            />
            <span class="dot" aria-hidden="true"></span>
            {{ labels[priority] }}
          </label>
        }
      </div>
    </fieldset>
  `,
  styleUrl: './priority-selector.scss',
})
export class PrioritySelector implements ControlValueAccessor {
  readonly name = input('priority');
  readonly legend = input('Prioridade');

  protected readonly priorities = TASK_PRIORITIES;
  protected readonly labels = PRIORITY_LABELS;
  protected readonly value = signal<TaskPriority | null>(null);
  protected readonly disabled = signal(false);

  private onChange: (value: TaskPriority) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(value: TaskPriority | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: TaskPriority) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected select(priority: TaskPriority): void {
    this.value.set(priority);
    this.onChange(priority);
  }
}
