import { DatePipe } from '@angular/common';
import { Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import { CopyButton } from '../../../../common/copy-button/copy-button';
import { EmptyState } from '../../../../common/empty-state/empty-state';
import { ErrorBanner } from '../../../../common/error-banner/error-banner';
import { LoadingIndicator } from '../../../../common/loading-indicator/loading-indicator';
import { PageChange, Pager } from '../../../../common/pager/pager';
import { PageHeader } from '../../../../common/page-header/page-header';
import { QuestionTypeLabelPipe } from '../../../../common/pipes/question-type-label.pipe';
import { StatusBadge } from '../../../../common/status-badge/status-badge';
import { AdminAnswer } from '../../../../core/api/models';
import { SurveyDetailStore } from '../../../../core/stores/survey-detail.store';

@Component({
  selector: 'app-survey-detail',
  imports: [
    DatePipe,
    RouterLink,
    PageHeader,
    StatusBadge,
    QuestionTypeLabelPipe,
    Pager,
    EmptyState,
    LoadingIndicator,
    ErrorBanner,
    CopyButton,
  ],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss',
})
export class SurveyDetail {
  /** Bound from the `:id` route parameter. */
  readonly id = input.required<string>();

  protected readonly store = inject(SurveyDetailStore);
  protected readonly apiBaseUrl = environment.apiBaseUrl;

  constructor() {
    effect(() => this.store.select(this.id()));
    this.store.load(this.store.query);
  }

  protected page(change: PageChange): void {
    this.store.setPage(change.limit, change.offset);
  }

  /** The public endpoint respondents' clients read the survey from. */
  protected publicUrl(slug: string): string {
    return `${this.apiBaseUrl}/public/surveys/${slug}`;
  }

  protected formatAnswer(answer: AdminAnswer): string {
    const { value } = answer;
    if (typeof value === 'string') return value.length > 0 ? value : '—';
    if (typeof value === 'number')
      return answer.question.type === 'rating' ? `${value} / 5` : String(value);
    return value.length > 0 ? value.join(', ') : '—';
  }
}
