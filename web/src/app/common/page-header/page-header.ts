import { Component, input } from '@angular/core';

/** Title row of an admin page; project buttons or links into the actions slot. */
@Component({
  selector: 'app-page-header',
  template: `
    <header class="page-header">
      <div class="page-header__text">
        @if (eyebrow(); as text) {
          <p class="page-header__eyebrow">{{ text }}</p>
        }
        <h1 class="page-header__title">{{ title() }}</h1>
        @if (lead(); as text) {
          <p class="page-header__lead">{{ text }}</p>
        }
      </div>
      <div class="page-header__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: `
    .page-header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px 24px;
      margin-bottom: 24px;
    }

    .page-header__eyebrow {
      margin-bottom: 4px;
      color: var(--primary);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .page-header__title {
      font-size: clamp(1.5rem, 2.5vw, 1.875rem);
    }

    .page-header__lead {
      margin-top: 6px;
      max-width: 60ch;
      color: var(--color-muted);
    }

    .page-header__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .page-header__actions:empty {
      display: none;
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly eyebrow = input<string>();
  readonly lead = input<string>();
}
