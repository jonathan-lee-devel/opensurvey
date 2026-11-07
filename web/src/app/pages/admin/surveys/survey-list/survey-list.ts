import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EmptyState } from '../../../../common/empty-state/empty-state';
import { ErrorBanner } from '../../../../common/error-banner/error-banner';
import { LoadingIndicator } from '../../../../common/loading-indicator/loading-indicator';
import { PageChange, Pager } from '../../../../common/pager/pager';
import { PageHeader } from '../../../../common/page-header/page-header';
import { StatusLabelPipe } from '../../../../common/pipes/status-label.pipe';
import { StatusBadge } from '../../../../common/status-badge/status-badge';
import { PUBLISH_STATUSES, PublishStatus } from '../../../../core/api/models';
import { SurveysStore } from '../../../../core/stores/surveys.store';

@Component({
  selector: 'app-survey-list',
  imports: [
    DatePipe,
    RouterLink,
    PageHeader,
    StatusBadge,
    StatusLabelPipe,
    Pager,
    EmptyState,
    LoadingIndicator,
    ErrorBanner,
  ],
  templateUrl: './survey-list.html',
  styleUrl: './survey-list.scss',
})
export class SurveyList {
  protected readonly store = inject(SurveysStore);
  protected readonly statuses = PUBLISH_STATUSES;

  constructor() {
    // Reactive: refetches whenever the filter or the page changes.
    this.store.load(this.store.query);
  }

  protected filter(status: PublishStatus | null): void {
    this.store.setStatusFilter(status);
  }

  protected page(change: PageChange): void {
    this.store.setPage(change.limit, change.offset);
  }
}
