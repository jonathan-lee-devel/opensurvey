import { Component, computed, input, output } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';

import { FormFieldGroup } from '../../../../common/form-field/form-field';
import { QUESTION_TYPE_LABELS } from '../../../../common/pipes/question-type-label.pipe';
import { QUESTION_TYPES, QuestionType, isChoiceType } from '../../../../core/api/models';

/** One question of the survey form, as the parent's model holds it. */
export interface QuestionFormModel {
  type: QuestionType;
  prompt: string;
  required: boolean;
  /** Only meaningful for choice types; kept empty otherwise. */
  options: string[];
}

export function emptyQuestion(): QuestionFormModel {
  return { type: 'short_text', prompt: '', required: false, options: [] };
}

/**
 * Edits one question in place through its Signal Forms field tree. Adding,
 * removing and reordering options happens here; the parent owns the list of
 * questions and is told through outputs when to move or drop this one.
 */
@Component({
  selector: 'app-question-editor',
  imports: [FormField, FormFieldGroup],
  templateUrl: './question-editor.html',
  styleUrl: './question-editor.scss',
})
export class QuestionEditor {
  readonly field = input.required<FieldTree<QuestionFormModel>>();
  readonly index = input.required<number>();
  readonly count = input.required<number>();

  readonly remove = output<void>();
  readonly moveUp = output<void>();
  readonly moveDown = output<void>();

  protected readonly types = QUESTION_TYPES;
  protected readonly typeLabels = QUESTION_TYPE_LABELS;

  protected readonly idPrefix = computed(() => `question-${this.index()}`);
  protected readonly isChoice = computed(() => isChoiceType(this.field().type().value()));
  protected readonly optionsState = computed(() => this.field().options());
  protected readonly showOptionsError = computed(() => {
    const state = this.optionsState();
    return state.errors().length > 0 && (state.touched() || state.dirty());
  });

  /** Keeps `options` consistent with the type: choice types start with two blanks, others have none. */
  protected onTypeChange(event: Event): void {
    const type = (event.target as HTMLSelectElement).value as QuestionType;
    const options = this.field().options().value;
    if (isChoiceType(type)) {
      if (options().length < 2) options.set(['', '']);
    } else if (options().length > 0) {
      options.set([]);
    }
  }

  protected addOption(): void {
    this.field()
      .options()
      .value.update((options) => [...options, '']);
  }

  protected removeOption(index: number): void {
    this.field()
      .options()
      .value.update((options) => options.filter((_, i) => i !== index));
  }
}
