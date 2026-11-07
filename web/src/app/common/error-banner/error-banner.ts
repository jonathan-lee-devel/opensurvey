import { Component, input, output } from '@angular/core';

/** An inline failure with an optional retry; errors from toasts are transient, this one stays. */
@Component({
  selector: 'app-error-banner',
  template: `
    <div class="error" role="alert">
      <p class="error__message">{{ message() }}</p>
      @if (retryable()) {
        <button type="button" class="btn btn--ghost btn--sm" (click)="retry.emit()">
          Try again
        </button>
      }
    </div>
  `,
  styles: `
    .error {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border: 1px solid rgba(180, 35, 24, 0.35);
      border-radius: var(--radius-sm);
      background: rgba(180, 35, 24, 0.08);
      color: var(--color-1dp);
    }
  `,
})
export class ErrorBanner {
  readonly message = input.required<string>();
  readonly retryable = input(true);
  readonly retry = output<void>();
}
