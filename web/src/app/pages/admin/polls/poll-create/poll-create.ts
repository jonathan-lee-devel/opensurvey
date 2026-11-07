import { Component, inject, signal } from '@angular/core';
import {
  FormField,
  applyEach,
  form,
  maxLength,
  pattern,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

import { FormFieldGroup } from '../../../../common/form-field/form-field';
import { PageHeader } from '../../../../common/page-header/page-header';
import { StatusLabelPipe } from '../../../../common/pipes/status-label.pipe';
import { CreatePollDto, PUBLISH_STATUSES, PublishStatus } from '../../../../core/api/models';
import {
  SLUG_PATTERN,
  UUID_PATTERN,
  slugify,
  toSubmitErrors,
} from '../../../../core/forms/form-utils';
import { PollsStore } from '../../../../core/stores/polls.store';
import { UsersStore } from '../../../../core/stores/users.store';

interface PollFormModel {
  ownerId: string;
  question: string;
  slug: string;
  status: PublishStatus;
  /** Local date-time from `<input type="datetime-local">`, or empty to stay open. */
  closesAt: string;
  options: string[];
}

function emptyPoll(): PollFormModel {
  return { ownerId: '', question: '', slug: '', status: 'draft', closesAt: '', options: ['', ''] };
}

@Component({
  selector: 'app-poll-create',
  imports: [RouterLink, FormField, FormFieldGroup, PageHeader, StatusLabelPipe],
  templateUrl: './poll-create.html',
  styleUrl: './poll-create.scss',
})
export class PollCreate {
  private readonly polls = inject(PollsStore);
  private readonly router = inject(Router);
  protected readonly users = inject(UsersStore);
  protected readonly statuses = PUBLISH_STATUSES;

  protected readonly model = signal<PollFormModel>(emptyPoll());
  private readonly slugEdited = signal(false);

  /** Mirrors `createPollSchema` in the API. */
  protected readonly form = form(this.model, (path) => {
    required(path.ownerId, { message: 'Choose the user who owns this poll.' });
    pattern(path.ownerId, UUID_PATTERN, { message: 'Choose a user from the list.' });
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
    validate(path.options, ({ value }) => {
      const count = value().length;
      if (count < 2) return { kind: 'minOptions', message: 'A poll needs at least 2 options.' };
      if (count > 20) return { kind: 'maxOptions', message: 'At most 20 options.' };
      return null;
    });
    applyEach(path.options, (option) => {
      required(option, { message: 'Enter a label.' });
      maxLength(option, 200, { message: 'At most 200 characters.' });
    });
  });

  constructor() {
    this.users.loadOwnerOptions();
  }

  protected onQuestionInput(event: Event): void {
    if (this.slugEdited()) return;
    this.form.slug().value.set(slugify((event.target as HTMLInputElement).value));
  }

  protected onSlugInput(): void {
    this.slugEdited.set(true);
  }

  protected addOption(): void {
    this.form.options().value.update((options) => [...options, '']);
  }

  protected removeOption(index: number): void {
    this.form.options().value.update((options) => options.filter((_, i) => i !== index));
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.form, async () => {
      try {
        const created = await this.polls.create(toDto(this.model()));
        await this.router.navigate(['/admin/polls', created.id]);
        return null;
      } catch (error) {
        return toSubmitErrors(error, {
          fieldFor: (path) => this.fieldFor(path),
          byStatus: { 409: this.form.slug, 422: this.form.ownerId },
        });
      }
    });
  }

  private fieldFor(path: string) {
    const [head, index] = path.split('.');
    switch (head) {
      case 'ownerId':
        return this.form.ownerId;
      case 'question':
        return this.form.question;
      case 'slug':
        return this.form.slug;
      case 'status':
        return this.form.status;
      case 'closesAt':
        return this.form.closesAt;
      case 'options':
        return index === undefined
          ? this.form.options
          : (this.form.options[Number(index)] ?? this.form.options);
      default:
        return undefined;
    }
  }
}

function toDto(model: PollFormModel): CreatePollDto {
  return {
    ownerId: model.ownerId.trim(),
    question: model.question.trim(),
    slug: model.slug.trim(),
    status: model.status,
    closesAt: model.closesAt.length > 0 ? new Date(model.closesAt).toISOString() : null,
    options: model.options.map((option) => option.trim()),
  };
}
