import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Rejects strings made only of whitespace (Validators.required accepts them). */
export function notBlank(control: AbstractControl<string | null>): ValidationErrors | null {
  const value = control.value;
  return typeof value === 'string' && value.length > 0 && value.trim().length === 0
    ? { blank: true }
    : null;
}
