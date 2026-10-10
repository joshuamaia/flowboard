import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Label + control + hint/error layout. The projected control should reference
 * `{fieldId}-hint` / `{fieldId}-error` through aria-describedby.
 */
@Component({
  selector: 'app-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.invalid]': '!!error()' },
  template: `
    <div class="label-row">
      <label [for]="fieldId()">
        {{ label() }}
        @if (required()) {
          <span class="required" aria-hidden="true">*</span>
        }
      </label>
      <ng-content select="[fieldAddon]" />
    </div>

    <ng-content />

    @if (error()) {
      <p class="message error" [id]="fieldId() + '-error'" role="alert">{{ error() }}</p>
    } @else if (hint()) {
      <p class="message hint" [id]="fieldId() + '-hint'">{{ hint() }}</p>
    }
  `,
  styleUrl: './form-field.scss',
})
export class FormField {
  readonly label = input.required<string>();
  readonly fieldId = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string | null>(null);
  readonly required = input(false);
}
