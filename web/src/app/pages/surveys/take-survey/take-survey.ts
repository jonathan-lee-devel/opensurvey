import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormField, applyEach, form, submit, validate } from '@angular/forms/signals';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { ErrorBanner } from '../../../common/error-banner/error-banner';
import { LoadingIndicator } from '../../../common/loading-indicator/loading-indicator';
import { isApiError } from '../../../core/api/api-error';
import {
  AdminQuestion,
  CreateSubmissionDto,
  QuestionType,
  SubmissionAnswerDto,
} from '../../../core/api/models';
import { toSubmitErrors } from '../../../core/forms/form-utils';
import { PublicSurveyStore } from '../../../core/stores/public-survey.store';

/** Limits from the API's submission rules (`public-survey-submissions.service.ts`). */
const SHORT_TEXT_MAX = 500;
const LONG_TEXT_MAX = 5000;
/** Radio values are strings; `toDto()` turns the chosen one into a number. */
export const RATING_SCALE: readonly string[] = ['1', '2', '3', '4', '5'];

/**
 * One slot per question, with a field for every shape an answer can take.
 * Only the field matching the question's type is shown and read; the rest
 * stay at their empty value. Radios and ratings hold strings because that is
 * what `<input type="radio">` carries; `toDto()` converts.
 */
export interface AnswerSlot {
  text: string;
  choice: string;
  choices: string[];
  rating: string;
}

interface AnswersModel {
  answers: AnswerSlot[];
}

export function emptySlot(): AnswerSlot {
  return { text: '', choice: '', choices: [], rating: '' };
}

/** Whether a slot carries an answer for a question of this type. */
export function isAnswered(type: QuestionType, slot: AnswerSlot): boolean {
  switch (type) {
    case 'short_text':
    case 'long_text':
      return slot.text.trim().length > 0;
    case 'single_choice':
      return slot.choice.length > 0;
    case 'multiple_choice':
      return slot.choices.length > 0;
    case 'rating':
      return slot.rating.length > 0;
  }
}

/** The answers to send: one per answered question, shaped for its type. */
export function toDto(
  questions: readonly AdminQuestion[],
  slots: readonly AnswerSlot[],
): CreateSubmissionDto {
  const answers: SubmissionAnswerDto[] = [];
  questions.forEach((question, index) => {
    const slot = slots[index];
    if (!slot || !isAnswered(question.type, slot)) return;
    switch (question.type) {
      case 'short_text':
      case 'long_text':
        answers.push({ questionId: question.id, value: slot.text.trim() });
        break;
      case 'single_choice':
        answers.push({ questionId: question.id, value: slot.choice });
        break;
      case 'multiple_choice':
        answers.push({ questionId: question.id, value: slot.choices });
        break;
      case 'rating':
        answers.push({ questionId: question.id, value: Number(slot.rating) });
        break;
    }
  });
  return { answers };
}

/** The page behind a survey's public link: read the questions, answer, get a receipt. */
@Component({
  selector: 'app-take-survey',
  imports: [DatePipe, RouterLink, FormField, LoadingIndicator, ErrorBanner],
  templateUrl: './take-survey.html',
  styleUrl: './take-survey.scss',
})
export class TakeSurvey {
  /** Bound from the `:slug` route parameter. */
  readonly slug = input.required<string>();

  protected readonly store = inject(PublicSurveyStore);
  protected readonly ratingScale = RATING_SCALE;
  private readonly titleService = inject(Title);

  protected readonly questions = computed(() => this.store.survey()?.questions ?? []);
  protected readonly model = signal<AnswersModel>({ answers: [] });
  protected readonly submitError = signal<string | null>(null);

  /** The API's rules, checked before a request: required questions, text lengths, rating range. */
  protected readonly form = form(this.model, (path) => {
    // A slot's sub-fields sit at ['answers', '<index>', '<field>'], which is
    // how a validator finds the question its slot answers.
    const questionFor = (ctx: { pathKeys: () => readonly string[] }) =>
      this.questions()[Number(ctx.pathKeys()[1])];
    applyEach(path.answers, (slot) => {
      validate(slot.text, (ctx) => {
        const question = questionFor(ctx);
        if (!question) return null;
        const text = ctx.value().trim();
        if (question.type !== 'short_text' && question.type !== 'long_text') return null;
        if (question.required && text.length === 0) {
          return { kind: 'required', message: 'This question needs an answer.' };
        }
        const max = question.type === 'short_text' ? SHORT_TEXT_MAX : LONG_TEXT_MAX;
        if (text.length > max) {
          return { kind: 'maxLength', message: `At most ${max} characters.` };
        }
        return null;
      });
      validate(slot.choice, (ctx) => {
        const question = questionFor(ctx);
        if (question?.type === 'single_choice' && question.required && ctx.value().length === 0) {
          return { kind: 'required', message: 'Choose one option.' };
        }
        return null;
      });
      validate(slot.choices, (ctx) => {
        const question = questionFor(ctx);
        if (question?.type === 'multiple_choice' && question.required && ctx.value().length === 0) {
          return { kind: 'required', message: 'Choose at least one option.' };
        }
        return null;
      });
      validate(slot.rating, (ctx) => {
        const question = questionFor(ctx);
        if (question?.type === 'rating' && question.required && ctx.value().length === 0) {
          return { kind: 'required', message: 'Pick a rating.' };
        }
        return null;
      });
    });
    validate(path.answers, (ctx) => {
      const answered = ctx.value().some((slot, index) => {
        const question = this.questions()[index];
        return question ? isAnswered(question.type, slot) : false;
      });
      return answered ? null : { kind: 'minAnswers', message: 'Answer at least one question.' };
    });
  });

  constructor() {
    effect(() => this.store.select(this.slug()));
    this.store.load(this.store.slug);
    // A fresh slot per question whenever a (different) survey arrives.
    effect(() => {
      const survey = this.store.survey();
      this.titleService.setTitle(survey ? `${survey.title} — OpenSurvey` : 'Survey — OpenSurvey');
      this.form().reset({ answers: survey ? survey.questions.map(() => emptySlot()) : [] });
    });
  }

  protected toggleChoice(index: number, option: string, checked: boolean): void {
    this.form.answers[index]
      ?.choices()
      .value.update((choices) =>
        checked ? [...new Set([...choices, option])] : choices.filter((c) => c !== option),
      );
  }

  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    this.submitError.set(null);
    await submit(this.form, async () => {
      try {
        await this.store.submit(toDto(this.questions(), this.model().answers));
        return null;
      } catch (error) {
        if (isApiError(error) && error.status === 404) {
          // Closed between loading and sending: the page explains it.
          this.store.reload();
          return null;
        }
        const errors = toSubmitErrors(error);
        this.submitError.set(errors.map((e) => e.message).join(' '));
        return errors;
      }
    });
  }
}
