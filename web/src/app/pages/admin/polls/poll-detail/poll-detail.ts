import { DOCUMENT, DatePipe, LowerCasePipe } from '@angular/common';
import { Component, effect, inject, input, signal, viewChild } from '@angular/core';
import {
  FormField,
  form,
  maxLength,
  pattern,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import { ConfirmDialog } from '../../../../common/confirm-dialog/confirm-dialog';
import { CopyButton } from '../../../../common/copy-button/copy-button';
import { ErrorBanner } from '../../../../common/error-banner/error-banner';
import { FormFieldGroup } from '../../../../common/form-field/form-field';
import { LoadingIndicator } from '../../../../common/loading-indicator/loading-indicator';
import { PageHeader } from '../../../../common/page-header/page-header';
import { StatusLabelPipe } from '../../../../common/pipes/status-label.pipe';
import { StatusBadge } from '../../../../common/status-badge/status-badge';
import { describeError } from '../../../../core/api/api-error';
import { AdminPoll, PUBLISH_STATUSES, PublishStatus } from '../../../../core/api/models';
import { SLUG_PATTERN, toSubmitErrors } from '../../../../core/forms/form-utils';
import { PollDetailStore } from '../../../../core/stores/poll-detail.store';
import { ToastsStore } from '../../../../core/stores/toasts.store';

interface PollEditModel {
  question: string;
  slug: string;
  /** Local date-time for `<input type="datetime-local">`, or empty to stay open. */
  closesAt: string;
}

/** ISO instant to the local `YYYY-MM-DDTHH:mm` a datetime-local input shows. */
export function toLocalDateTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

@Component({
  selector: 'app-poll-detail',
  imports: [
    DatePipe,
    LowerCasePipe,
    RouterLink,
    FormField,
    FormFieldGroup,
    PageHeader,
    StatusBadge,
    StatusLabelPipe,
    LoadingIndicator,
    ErrorBanner,
    CopyButton,
    ConfirmDialog,
  ],
  templateUrl: './poll-detail.html',
  styleUrl: './poll-detail.scss',
})
export class PollDetail {
  /** Bound from the `:id` route parameter. */
  readonly id = input.required<string>();

  protected readonly store = inject(PollDetailStore);
  protected readonly statuses = PUBLISH_STATUSES;
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastsStore);
  private readonly origin = inject(DOCUMENT).defaultView?.location.origin ?? '';
  private readonly deleteDialog = viewChild.required(ConfirmDialog);

  protected readonly changingStatus = signal<PublishStatus | null>(null);
  protected readonly editing = signal(false);
  protected readonly editModel = signal<PollEditModel>({ question: '', slug: '', closesAt: '' });

  /** The editable subset of `createPollSchema`, with the same limits. */
  protected readonly editForm = form(this.editModel, (path) => {
    required(path.question, { message: 'Enter the question.' });
    maxLength(path.question, 500, { message: 'At most 500 characters.' });
    required(path.slug, { message: 'Enter the slug for the public link.' });
    maxLength(path.slug, 64, { message: 'At most 64 characters.' });
    pattern(path.slug, SLUG_PATTERN, {
      message: 'Lowercase letters and digits separated by single hyphens.',
    });
    validate(path.closesAt, ({ value }) => {
      const text = value();
      if (text.length === 0) return null;
      return Number.isNaN(new Date(text).getTime())
        ? { kind: 'invalidDate', message: 'Enter a valid date and time.' }
        : null;
    });
  });

  constructor() {
    effect(() => this.store.select(this.id()));
    this.store.load(this.store.pollId);
  }

  /** The public endpoint voters' clients read the poll from. */
  protected publicUrl(slug: string): string {
    return `${environment.apiBaseUrl}/public/polls/${slug}`;
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

  protected startEdit(poll: AdminPoll): void {
    this.editForm().reset({
      question: poll.question,
      slug: poll.slug,
      closesAt: toLocalDateTime(poll.closesAt),
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
          question: model.question.trim(),
          slug: model.slug.trim(),
          closesAt: model.closesAt.length > 0 ? new Date(model.closesAt).toISOString() : null,
        });
        this.editing.set(false);
        return null;
      } catch (error) {
        return toSubmitErrors(error, {
          fieldFor: (path) =>
            path === 'question'
              ? this.editForm.question
              : path === 'slug'
                ? this.editForm.slug
                : path === 'closesAt'
                  ? this.editForm.closesAt
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
      await this.router.navigate(['/admin/polls']);
    } catch (error) {
      this.toasts.error(describeError(error));
    }
  }
}
