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
import {
  CreateQuestionDto,
  CreateSurveyDto,
  PUBLISH_STATUSES,
  PublishStatus,
  isChoiceType,
} from '../../../../core/api/models';
import {
  SLUG_PATTERN,
  UUID_PATTERN,
  nullIfBlank,
  slugify,
  toSubmitErrors,
} from '../../../../core/forms/form-utils';
import { SurveysStore } from '../../../../core/stores/surveys.store';
import { UsersStore } from '../../../../core/stores/users.store';
import { QuestionEditor, QuestionFormModel, emptyQuestion } from './question-editor';

interface SurveyFormModel {
  ownerId: string;
  title: string;
  description: string;
  slug: string;
  status: PublishStatus;
  questions: QuestionFormModel[];
}

@Component({
  selector: 'app-survey-create',
  imports: [RouterLink, FormField, FormFieldGroup, PageHeader, StatusLabelPipe, QuestionEditor],
  templateUrl: './survey-create.html',
  styleUrl: './survey-create.scss',
})
export class SurveyCreate {
  private readonly surveys = inject(SurveysStore);
  private readonly router = inject(Router);
  protected readonly users = inject(UsersStore);
  protected readonly statuses = PUBLISH_STATUSES;

  protected readonly model = signal<SurveyFormModel>({
    ownerId: '',
    title: '',
    description: '',
    slug: '',
    status: 'draft',
    questions: [emptyQuestion()],
  });

  /** Once the slug has been edited by hand it stops following the title. */
  private readonly slugEdited = signal(false);

  /** Mirrors `createSurveySchema` in the API so most mistakes are caught before a request. */
  protected readonly form = form(this.model, (path) => {
    required(path.ownerId, { message: 'Choose the user who owns this survey.' });
    pattern(path.ownerId, UUID_PATTERN, { message: 'Choose a user from the list.' });
    required(path.title, { message: 'Give the survey a title.' });
    maxLength(path.title, 200, { message: 'At most 200 characters.' });
    maxLength(path.description, 2000, { message: 'At most 2000 characters.' });
    required(path.slug, { message: 'Enter the slug for the public link.' });
    maxLength(path.slug, 64, { message: 'At most 64 characters.' });
    pattern(path.slug, SLUG_PATTERN, {
      message: 'Lowercase letters and digits separated by single hyphens.',
    });
    validate(path.questions, ({ value }) => {
      const count = value().length;
      if (count < 1) return { kind: 'minQuestions', message: 'Add at least one question.' };
      if (count > 50)
        return { kind: 'maxQuestions', message: 'A survey can have at most 50 questions.' };
      return null;
    });
    applyEach(path.questions, (question) => {
      required(question.prompt, { message: 'Enter the question.' });
      maxLength(question.prompt, 500, { message: 'At most 500 characters.' });
      validate(question.options, (ctx) => {
        if (!isChoiceType(ctx.valueOf(question.type))) return null;
        const count = ctx.value().length;
        if (count < 2)
          return { kind: 'minOptions', message: 'Choice questions need at least 2 options.' };
        if (count > 20) return { kind: 'maxOptions', message: 'At most 20 options.' };
        return null;
      });
      applyEach(question.options, (option) => {
        required(option, {
          message: 'Enter a label.',
          when: (ctx) => isChoiceType(ctx.valueOf(question.type)),
        });
        maxLength(option, 200, { message: 'At most 200 characters.' });
      });
    });
  });

  constructor() {
    this.users.loadOwnerOptions();
  }

  protected onTitleInput(event: Event): void {
    if (this.slugEdited()) return;
    const title = (event.target as HTMLInputElement).value;
    this.form.slug().value.set(slugify(title));
  }

  protected onSlugInput(): void {
    this.slugEdited.set(true);
  }

  protected addQuestion(): void {
    this.form.questions().value.update((questions) => [...questions, emptyQuestion()]);
  }

  protected removeQuestion(index: number): void {
    this.form.questions().value.update((questions) => questions.filter((_, i) => i !== index));
  }

  protected moveQuestion(index: number, direction: -1 | 1): void {
    this.form.questions().value.update((questions) => {
      const target = index + direction;
      if (target < 0 || target >= questions.length) return questions;
      const next = [...questions];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.form, async () => {
      try {
        const created = await this.surveys.create(toDto(this.model()));
        await this.router.navigate(['/admin/surveys', created.id]);
        return null;
      } catch (error) {
        return toSubmitErrors(error, {
          fieldFor: (path) => this.fieldFor(path),
          byStatus: { 409: this.form.slug, 422: this.form.ownerId },
        });
      }
    });
  }

  /** Resolves an API request path such as `questions.1.options` to its field. */
  private fieldFor(path: string) {
    const [head, index, leaf] = path.split('.');
    switch (head) {
      case 'ownerId':
        return this.form.ownerId;
      case 'title':
        return this.form.title;
      case 'description':
        return this.form.description;
      case 'slug':
        return this.form.slug;
      case 'status':
        return this.form.status;
      case 'questions': {
        if (index === undefined) return this.form.questions;
        const question = this.form.questions[Number(index)];
        if (!question) return this.form.questions;
        if (leaf === 'prompt') return question.prompt;
        if (leaf === 'options') return question.options;
        if (leaf === 'type') return question.type;
        return question;
      }
      default:
        return undefined;
    }
  }
}

function toDto(model: SurveyFormModel): CreateSurveyDto {
  return {
    ownerId: model.ownerId.trim(),
    title: model.title.trim(),
    description: nullIfBlank(model.description),
    slug: model.slug.trim(),
    status: model.status,
    questions: model.questions.map(toQuestionDto),
  };
}

function toQuestionDto(question: QuestionFormModel): CreateQuestionDto {
  const dto: CreateQuestionDto = {
    type: question.type,
    prompt: question.prompt.trim(),
    required: question.required,
  };
  return isChoiceType(question.type)
    ? { ...dto, options: question.options.map((option) => option.trim()) }
    : dto;
}
