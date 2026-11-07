import { Component, input } from '@angular/core';

import { PublishStatus } from '../../core/api/models';
import { StatusLabelPipe } from '../pipes/status-label.pipe';

/** Draft, published or closed, coloured so a list scans at a glance. */
@Component({
  selector: 'app-status-badge',
  imports: [StatusLabelPipe],
  template: `<span class="badge" [class]="'badge badge--' + status()">{{
    status() | statusLabel
  }}</span>`,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 0.8125rem;
      font-weight: 700;
      line-height: 1.5;
      white-space: nowrap;
    }

    .badge::before {
      content: '';
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
    }

    .badge--draft {
      background: var(--background-3dp);
      color: var(--color);
    }

    .badge--published {
      background: rgba(26, 127, 75, 0.14);
      color: #137a45;
    }

    .badge--closed {
      background: rgba(180, 35, 24, 0.12);
      color: #b42318;
    }

    @media (prefers-color-scheme: dark) {
      .badge--published {
        color: #5fd39a;
      }

      .badge--closed {
        color: #ff8f85;
      }
    }
  `,
})
export class StatusBadge {
  readonly status = input.required<PublishStatus>();
}
