import { Component, computed, input } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';

/**
 * Label, hint and error wiring around one Signal Forms field. The control is
 * projected in with the same `id`; point its `aria-describedby` at
 * `<id>-hint` and `<id>-error` when they exist.
 *
 * Errors show once the field has been touched (or the form submitted) so a
 * form does not open covered in red.
 */
@Component({
  selector: 'app-form-field',
  template: `
    <div class="field" [class.field--invalid]="showErrors()">
      <label class="field__label" [for]="controlId()">
        {{ label() }}
        @if (state().required()) {
          <span class="field__required" aria-hidden="true">*</span>
        } @else if (optionalHint()) {
          <span class="field__optional">(optional)</span>
        }
      </label>
      <ng-content />
      @if (hint(); as text) {
        <p class="field__hint" [id]="controlId() + '-hint'">{{ text }}</p>
      }
      @if (showErrors()) {
        <ul class="field__errors" [id]="controlId() + '-error'">
          @for (error of state().errors(); track $index) {
            <li>{{ error.message ?? describe(error.kind) }}</li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .field {
      display: grid;
      gap: 6px;
    }

    .field__label {
      color: var(--color-1dp);
      font-size: 0.9rem;
      font-weight: 700;
    }

    .field__required {
      color: #b42318;
      margin-left: 2px;
    }

    .field__optional {
      margin-left: 4px;
      color: var(--color-muted);
      font-weight: 500;
    }

    .field__hint {
      color: var(--color-muted);
      font-size: 0.85rem;
    }

    .field__errors {
      margin: 0;
      padding: 0;
      list-style: none;
      color: #b42318;
      font-size: 0.85rem;
      font-weight: 600;
    }
  `,
})
export class FormFieldGroup {
  readonly field = input.required<FieldTree<unknown>>();
  readonly label = input.required<string>();
  /** The projected control's `id`; named so the host element does not get a duplicate `id`. */
  readonly controlId = input.required<string>();
  readonly hint = input<string>();
  readonly optionalHint = input(true);

  protected readonly state = computed(() => this.field()());
  protected readonly showErrors = computed(() => {
    const state = this.state();
    return state.invalid() && state.touched();
  });

  protected describe(kind: string): string {
    switch (kind) {
      case 'required':
        return 'This field is required.';
      case 'minLength':
        return 'Too short.';
      case 'maxLength':
        return 'Too long.';
      case 'pattern':
        return 'Not in the expected format.';
      case 'email':
        return 'Enter a valid email address.';
      default:
        return 'This value is not valid.';
    }
  }
}
