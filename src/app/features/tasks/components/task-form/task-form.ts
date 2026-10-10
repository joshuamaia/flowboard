import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  output,
  viewChild,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { FormField } from '../../../../shared/components/form-field/form-field';
import { RangeInput } from '../../../../shared/components/range-input/range-input';
import { validationMessage } from '../../../../shared/forms/validation-messages';
import { notBlank } from '../../../../shared/forms/validators';
import { formatDuration } from '../../../../shared/pipes/duration.pipe';
import { TASK_LIMITS } from '../../models/task-limits';
import { NewTaskInput, TaskPriority } from '../../models/task.model';
import { PrioritySelector } from '../priority-selector/priority-selector';

type FieldName = 'title' | 'description' | 'durationMs' | 'failureProbability';

@Component({
  selector: 'app-task-form',
  imports: [ReactiveFormsModule, FormField, RangeInput, PrioritySelector],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss',
})
export class TaskForm {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  readonly submitted = output<NewTaskInput>();
  readonly cancelled = output();

  protected readonly limits = TASK_LIMITS;
  protected readonly formatDuration = formatDuration;
  protected readonly formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

  readonly form = this.fb.group({
    title: [
      '',
      [
        Validators.required,
        notBlank,
        Validators.minLength(TASK_LIMITS.titleMinLength),
        Validators.maxLength(TASK_LIMITS.titleMaxLength),
      ],
    ],
    description: ['', Validators.maxLength(TASK_LIMITS.descriptionMaxLength)],
    priority: this.fb.control<TaskPriority>('MEDIUM', Validators.required),
    durationMs: [
      TASK_LIMITS.durationMs.default as number,
      [
        Validators.required,
        Validators.min(TASK_LIMITS.durationMs.min),
        Validators.max(TASK_LIMITS.durationMs.max),
      ],
    ],
    failureProbability: [
      TASK_LIMITS.failureProbability.default as number,
      [
        Validators.required,
        Validators.min(TASK_LIMITS.failureProbability.min),
        Validators.max(TASK_LIMITS.failureProbability.max),
      ],
    ],
  });

  constructor() {
    afterNextRender(() => this.titleInput()?.nativeElement.focus());
  }

  protected errorFor(field: FieldName): string | null {
    return validationMessage(this.form.controls[field]);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.titleInput()?.nativeElement.focus();
      return;
    }

    const { title, description, ...rest } = this.form.getRawValue();
    const trimmedDescription = description.trim();
    this.submitted.emit({
      title: title.trim(),
      ...(trimmedDescription ? { description: trimmedDescription } : {}),
      ...rest,
    });
  }
}
