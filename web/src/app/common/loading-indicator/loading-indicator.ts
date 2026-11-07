import { Component, input } from '@angular/core';

/** Announced to screen readers through the live region; the bar is decorative. */
@Component({
  selector: 'app-loading-indicator',
  template: `
    <div class="loading" role="status">
      <span class="loading__bar" aria-hidden="true"></span>
      <span class="loading__label">{{ label() }}</span>
    </div>
  `,
  styles: `
    .loading {
      display: grid;
      gap: 10px;
      padding: 24px 0;
      color: var(--color-muted);
      font-size: 0.9rem;
    }

    .loading__bar {
      position: relative;
      display: block;
      height: 4px;
      overflow: hidden;
      border-radius: 999px;
      background: var(--background-3dp);
    }

    .loading__bar::after {
      content: '';
      position: absolute;
      inset: 0 auto 0 -40%;
      width: 40%;
      border-radius: inherit;
      background: var(--primary-gradient);
      animation: slide 1.1s ease-in-out infinite;
    }

    @keyframes slide {
      to {
        left: 100%;
      }
    }
  `,
})
export class LoadingIndicator {
  readonly label = input('Loading…');
}
