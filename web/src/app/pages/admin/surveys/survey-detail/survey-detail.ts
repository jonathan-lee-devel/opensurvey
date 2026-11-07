import { DOCUMENT, DatePipe, LowerCasePipe } from '@angular/common';
import { Component, effect, inject, input, signal, viewChild } from '@angular/core';
import { FormField, form, maxLength, pattern, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import { ConfirmDialog } from '../../../../common/confirm-dialog/confirm-dialog';
import { CopyButton } from '../../../../common/copy-button/copy-button';
import { EmptyState } from '../../../../common/empty-state/empty-state';
import { ErrorBanner } from '../../../../common/error-banner/error-banner';
import { FormFieldGroup } from '../../../../common/form-field/form-field';
import { LoadingIndicator } from '../../../../common/loading-indicator/loading-indicator';
import { PageChange, Pager } from '../../../../common/pager/pager';
import { PageHeader } from '../../../../common/page-header/page-header';
import { QuestionTypeLabelPipe } from '../../../../common/pipes/question-type-label.pipe';
import { StatusLabelPipe } from '../../../../common/pipes/status-label.pipe';
import { StatusBadge } from '../../../../common/status-badge/status-badge';
import { describeError } from '../../../../core/api/api-error';
import {
  AdminAnswer,
  AdminSurvey,
  PUBLISH_STATUSES,
  PublishStatus,
} from '../../../../core/api/models';
import { SLUG_PATTERN, nullIfBlank, toSubmitErrors } from '../../../../core/forms/form-utils';
import { SurveyDetailStore } from '../../../../core/stores/survey-detail.store';
import { ToastsStore } from '../../../../core/stores/toasts.store';

interface SurveyEditModel {
  title: string;
  description: string;
  slug: string;
}

@Component({
  selector: 'app-survey-detail',
  imports: [
    DatePipe,
    LowerCasePipe,
    RouterLink,
    FormField,
    FormFieldGroup,
    PageHeader,
    StatusBadge,
    StatusLabelPipe,
    QuestionTypeLabelPipe,
    Pager,
    EmptyState,
    LoadingIndicator,
    ErrorBanner,
    CopyButton,
    ConfirmDialog,
  ],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss',
})
export class SurveyDetail {
  /** Bound from the `:id` route parameter. */
  readonly id = input.required<string>();

  protected readonly store = inject(SurveyDetailStore);
  protected readonly statuses = PUBLISH_STATUSES;
  protected readonly apiBaseUrl = environment.apiBaseUrl;
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastsStore);
  private readonly origin = inject(DOCUMENT).defaultView?.location.origin ?? '';
  private readonly deleteDialog = viewChild.required(ConfirmDialog);

  /** Which status change is in flight, so its button can show it. */
  protected readonly changingStatus = signal<PublishStatus | null>(null);
  protected readonly editing = signal(false);

  protected readonly editModel = signal<SurveyEditModel>({ title: '', description: '', slug: '' });

  /** The editable subset of `createSurveySchema`, with the same limits. */
  protected readonly editForm = form(this.editModel, (path) => {
    required(path.title, { message: 'Give the survey a title.' });
    maxLength(path.title, 200, { message: 'At most 200 characters.' });
    maxLength(path.description, 2000, { message: 'At most 2000 characters.' });
    required(path.slug, { message: 'Enter the slug for the public link.' });
    maxLength(path.slug, 64, { message: 'At most 64 characters.' });
    pattern(path.slug, SLUG_PATTERN, {
      message: 'Lowercase letters and digits separated by single hyphens.',
    });
  });

  constructor() {
    effect(() => this.store.select(this.id()));
    this.store.load(this.store.query);
  }

  protected page(change: PageChange): void {
    this.store.setPage(change.limit, change.offset);
  }

  /** The page respondents fill in: this app's own `/s/<slug>` route. */
  protected publicLink(slug: string): string {
    return `${this.origin}/s/${slug}`;
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

  protected async setStatus(status: PublishStatus): Promise<void> {
    this.changingStatus.set(status);
    try {
      await this.store.update({ status });
    } catch (error) {
      this.toasts.error(describeError(error));
    } finally {
      this.changingStatus.set(null);
    }
  }

  protected startEdit(survey: AdminSurvey): void {
    this.editForm().reset({
      title: survey.title,
      description: survey.description ?? '',
      slug: survey.slug,
    });
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
  }

  protected async saveEdit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.editForm, async () => {
      const model = this.editModel();
      try {
        await this.store.update({
          title: model.title.trim(),
          description: nullIfBlank(model.description),
          slug: model.slug.trim(),
        });
        this.editing.set(false);
        return null;
      } catch (error) {
        return toSubmitErrors(error, {
          fieldFor: (path) =>
            path === 'title'
              ? this.editForm.title
              : path === 'description'
                ? this.editForm.description
                : path === 'slug'
                  ? this.editForm.slug
                  : undefined,
          byStatus: { 409: this.editForm.slug },
        });
      }
    });
  }

  protected async confirmDelete(): Promise<void> {
    if (!(await this.deleteDialog().open())) return;
    try {
      await this.store.remove();
      await this.router.navigate(['/admin/surveys']);
    } catch (error) {
      this.toasts.error(describeError(error));
    }
  }
}
