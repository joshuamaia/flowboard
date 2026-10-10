import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Slider with a live formatted value, usable with reactive forms. */
@Component({
  selector: 'app-range-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RangeInput), multi: true },
  ],
  template: `
    <input
      type="range"
      [id]="inputId()"
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [value]="value()"
      [disabled]="disabled()"
      [attr.aria-valuetext]="display()"
      [attr.aria-describedby]="describedBy()"
      [style.--fill]="fillPercent() + '%'"
      (input)="onInput($event)"
      (blur)="onTouched()"
    />
    <output class="mono" [for]="inputId()">{{ display() }}</output>
  `,
  styleUrl: './range-input.scss',
})
export class RangeInput implements ControlValueAccessor {
  readonly inputId = input.required<string>();
  readonly min = input(0);
  readonly max = input(100);
  readonly step = input(1);
  readonly format = input<(value: number) => string>(String);
  readonly describedBy = input<string>();

  protected readonly value = signal(0);
  protected readonly disabled = signal(false);
  protected readonly display = computed(() => this.format()(this.value()));
  protected readonly fillPercent = computed(() => {
    const range = this.max() - this.min();
    return range > 0 ? ((this.value() - this.min()) / range) * 100 : 0;
  });

  private onChange: (value: number) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(value: number | null): void {
    this.value.set(value ?? this.min());
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.value.set(value);
    this.onChange(value);
  }
}
