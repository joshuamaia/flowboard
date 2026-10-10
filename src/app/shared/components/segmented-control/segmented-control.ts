import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SegmentOption<T> {
  value: T;
  label: string;
}

/** Radio-group based segmented control for reactive forms (arrow keys work natively). */
@Component({
  selector: 'app-segmented-control',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SegmentedControl), multi: true },
  ],
  template: `
    <fieldset>
      <legend>{{ legend() }}</legend>
      <div class="options" [style.--count]="options().length">
        @for (option of options(); track option.value) {
          <label class="option">
            <input
              type="radio"
              [name]="name()"
              [checked]="value() === option.value"
              [disabled]="disabled()"
              (change)="select(option.value)"
              (blur)="onTouched()"
            />
            {{ option.label }}
          </label>
        }
      </div>
      @if (hint()) {
        <p class="hint">{{ hint() }}</p>
      }
    </fieldset>
  `,
  styleUrl: './segmented-control.scss',
})
export class SegmentedControl<T extends string | number> implements ControlValueAccessor {
  readonly options = input.required<readonly SegmentOption<T>[]>();
  readonly legend = input.required<string>();
  readonly name = input.required<string>();
  readonly hint = input<string>();

  protected readonly value = signal<T | null>(null);
  protected readonly disabled = signal(false);

  private onChange: (value: T) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(value: T | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected select(value: T): void {
    this.value.set(value);
    this.onChange(value);
  }
}
