import { DatePipe } from '@angular/common';
import { Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import { CopyButton } from '../../../../common/copy-button/copy-button';
import { ErrorBanner } from '../../../../common/error-banner/error-banner';
import { LoadingIndicator } from '../../../../common/loading-indicator/loading-indicator';
import { PageHeader } from '../../../../common/page-header/page-header';
import { StatusBadge } from '../../../../common/status-badge/status-badge';
import { PollDetailStore } from '../../../../core/stores/poll-detail.store';

@Component({
  selector: 'app-poll-detail',
  imports: [
    DatePipe,
    RouterLink,
    PageHeader,
    StatusBadge,
    LoadingIndicator,
    ErrorBanner,
    CopyButton,
  ],
  templateUrl: './poll-detail.html',
  styleUrl: './poll-detail.scss',
})
export class PollDetail {
  /** Bound from the `:id` route parameter. */
  readonly id = input.required<string>();

  protected readonly store = inject(PollDetailStore);

  constructor() {
    effect(() => this.store.select(this.id()));
    this.store.load(this.store.pollId);
  }

  /** The public endpoint voters' clients read the poll from. */
  protected publicUrl(slug: string): string {
    return `${environment.apiBaseUrl}/public/polls/${slug}`;
  }
}
