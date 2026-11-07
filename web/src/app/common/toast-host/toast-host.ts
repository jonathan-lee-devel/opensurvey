import { Component, inject } from '@angular/core';

import { ToastsStore } from '../../core/stores/toasts.store';

/**
 * Renders the `ToastsStore` queue in a live region. Place it once, in the root
 * component, so toasts outlive page navigation.
 */
@Component({
  selector: 'app-toast-host',
  template: `
    <div class="toasts" role="status" aria-live="polite" aria-atomic="false">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class]="'toast toast--' + toast.kind">
          <span class="toast__message">{{ toast.message }}</span>
          <button
            type="button"
            class="toast__dismiss"
            aria-label="Dismiss notification"
            (click)="toasts.dismiss(toast.id)"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      inset-block-end: 1rem;
      inset-inline-end: 1rem;
      display: grid;
      gap: 0.5rem;
      max-width: min(26rem, calc(100vw - 2rem));
      z-index: 100;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 0.875rem;
      border: 1px solid var(--border-color-strong);
      border-inline-start: 4px solid var(--toast-accent, var(--primary));
      border-radius: var(--radius-sm);
      background: var(--background-1dp);
      color: var(--color-1dp);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
      font-size: 0.9375rem;
      line-height: 1.4;
    }

    .toast--success {
      --toast-accent: #1a7f4b;
    }

    .toast--error {
      --toast-accent: #c0392b;
    }

    .toast__message {
      flex: 1;
    }

    .toast__dismiss {
      flex: none;
      display: grid;
      place-items: center;
      width: 1.75rem;
      height: 1.75rem;
      margin: -0.25rem -0.25rem -0.25rem 0;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--color-muted);
      cursor: pointer;
    }

    .toast__dismiss:hover,
    .toast__dismiss:focus-visible {
      background: var(--hover-surface);
      color: var(--color-1dp);
    }

    .toast__dismiss:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }
  `,
})
export class ToastHost {
  protected readonly toasts = inject(ToastsStore);
}
