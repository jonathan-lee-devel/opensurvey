import { Pipe, PipeTransform } from '@angular/core';

import { QuestionType } from '../../core/api/models';

export const QUESTION_TYPE_LABELS: Readonly<Record<QuestionType, string>> = {
  short_text: 'Short text',
  long_text: 'Long text',
  single_choice: 'Single choice',
  multiple_choice: 'Multiple choice',
  rating: 'Rating (1 to 5)',
};

@Pipe({ name: 'questionTypeLabel' })
export class QuestionTypeLabelPipe implements PipeTransform {
  transform(type: QuestionType): string {
    return QUESTION_TYPE_LABELS[type];
  }
}
