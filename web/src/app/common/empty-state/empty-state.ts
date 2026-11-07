import { Component, input } from '@angular/core';

/** A friendly "nothing here yet" with room for a call to action. */
@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty">
      <p class="empty__title">{{ title() }}</p>
      @if (text(); as body) {
        <p class="empty__text">{{ body }}</p>
      }
      <div class="empty__actions"><ng-content /></div>
    </div>
  `,
  styles: `
    .empty {
      display: grid;
      justify-items: center;
      gap: 8px;
      padding: 48px 24px;
      border: 1px dashed var(--border-color-strong);
      border-radius: var(--radius);
      text-align: center;
    }

    .empty__title {
      color: var(--color-1dp);
      font-weight: 700;
      font-size: 1.0625rem;
    }

    .empty__text {
      max-width: 48ch;
      color: var(--color-muted);
    }

    .empty__actions {
      display: flex;
      gap: 10px;
      margin-top: 8px;
    }

    .empty__actions:empty {
      display: none;
    }
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly text = input<string>();
}
