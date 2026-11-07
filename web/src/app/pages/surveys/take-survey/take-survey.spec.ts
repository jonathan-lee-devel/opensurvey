import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AdminQuestion } from '../../../core/api/models';
import { PublicSurveysService } from '../../../core/api/public-surveys.service';
import { emptySlot, isAnswered, toDto } from './take-survey';

const question = (
  id: string,
  type: AdminQuestion['type'],
  options: string[] | null = null,
): AdminQuestion => ({
  id,
  type,
  prompt: id,
  required: false,
  position: 0,
  options,
});

describe('take-survey answer mapping', () => {
  it('sends only answered questions, shaped for their type', () => {
    const questions = [
      question('text', 'short_text'),
      question('essay', 'long_text'),
      question('one', 'single_choice', ['A', 'B']),
      question('many', 'multiple_choice', ['A', 'B', 'C']),
      question('stars', 'rating'),
    ];
    const slots = [
      { ...emptySlot(), text: '  Ada ' },
      emptySlot(),
      { ...emptySlot(), choice: 'B' },
      { ...emptySlot(), choices: ['A', 'C'] },
      { ...emptySlot(), rating: '4' },
    ];
    expect(toDto(questions, slots)).toEqual({
      answers: [
        { questionId: 'text', value: 'Ada' },
        { questionId: 'one', value: 'B' },
        { questionId: 'many', value: ['A', 'C'] },
        { questionId: 'stars', value: 4 },
      ],
    });
  });

  it('treats blank text and empty selections as unanswered', () => {
    expect(isAnswered('short_text', { ...emptySlot(), text: '   ' })).toBe(false);
    expect(isAnswered('multiple_choice', emptySlot())).toBe(false);
    expect(isAnswered('rating', { ...emptySlot(), rating: '1' })).toBe(true);
  });
});

describe('PublicSurveysService', () => {
  it('posts the answers anonymously with the Idempotency-Key header', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const backend = TestBed.inject(HttpTestingController);
    TestBed.inject(PublicSurveysService).submit('feedback', { answers: [] }, 'key-1').subscribe();
    const request = backend.expectOne({
      method: 'POST',
      url: '/api/public/surveys/feedback/submissions',
    });
    expect(request.request.headers.get('Idempotency-Key')).toBe('key-1');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ id: 'r1', surveyId: 's1', submittedAt: 'now' });
    backend.verify();
  });
});
