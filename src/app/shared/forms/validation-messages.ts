import { AbstractControl } from '@angular/forms';

interface LengthError {
  requiredLength: number;
}

interface MinError {
  min: number;
}

interface MaxError {
  max: number;
}

/**
 * Maps the first validation error of a control to a user-facing message.
 * Returns null while the control is valid or hasn't been interacted with.
 */
export function validationMessage(control: AbstractControl): string | null {
  const errors = control.errors;
  if (!errors || !(control.touched || control.dirty)) {
    return null;
  }

  if (errors['required'] || errors['blank']) {
    return 'Campo obrigatório.';
  }
  if (errors['minlength']) {
    return `Informe ao menos ${(errors['minlength'] as LengthError).requiredLength} caracteres.`;
  }
  if (errors['maxlength']) {
    return `Use no máximo ${(errors['maxlength'] as LengthError).requiredLength} caracteres.`;
  }
  if (errors['min']) {
    return `O valor mínimo é ${(errors['min'] as MinError).min}.`;
  }
  if (errors['max']) {
    return `O valor máximo é ${(errors['max'] as MaxError).max}.`;
  }
  return 'Valor inválido.';
}
