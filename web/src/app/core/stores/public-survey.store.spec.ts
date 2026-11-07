import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ApiError } from '../api/api-error';
import { PublicSurvey } from '../api/models';
import { PublicSurveysService } from '../api/public-surveys.service';
import { PublicSurveyStore } from './public-survey.store';

const survey: PublicSurvey = {
  id: 's1',
  title: 'Feedback',
  description: null,
  slug: 'feedback',
  status: 'published',
  questions: [],
};
const dto = { answers: [{ questionId: 'q1', value: 'Ada' }] };

describe('PublicSurveyStore', () => {
  const api = { findBySlug: vi.fn(), submit: vi.fn() };

  beforeEach(() => {
    api.findBySlug.mockReset().mockReturnValue(of(survey));
    api.submit.mockReset();
    TestBed.configureTestingModule({
      providers: [PublicSurveyStore, { provide: PublicSurveysService, useValue: api }],
    });
  });

  const loaded = () => {
    const store = TestBed.inject(PublicSurveyStore);
    TestBed.runInInjectionContext(() => store.load(store.slug));
    store.select('feedback');
    TestBed.tick();
    return store;
  };

  it('loads the survey for its slug and records a not-found as an error', () => {
    const store = loaded();
    expect(store.survey()).toEqual(survey);

    api.findBySlug.mockReturnValue(throwError(() => new ApiError(404, 'No published survey "x"')));
    store.select('x');
    TestBed.tick();
    expect(store.survey()).toBeNull();
    expect(store.error()).toContain('No published survey');
  });

  it('submits with a fresh Idempotency-Key per attempt and keeps the receipt', async () => {
    const store = loaded();
    api.submit.mockReturnValue(of({ id: 'r1', surveyId: 's1', submittedAt: 'now' }));

    await store.submit(dto);

    const [slug, body, key] = api.submit.mock.calls[0];
    expect(slug).toBe('feedback');
    expect(body).toEqual(dto);
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(store.receipt()?.id).toBe('r1');
    expect(store.pendingKey()).toBeNull();
  });

  it('resends the same key after a network failure, but not after a rejection', async () => {
    const store = loaded();
    api.submit.mockReturnValueOnce(throwError(() => new ApiError(0, 'Offline')));
    await expect(store.submit(dto)).rejects.toBeInstanceOf(ApiError);
    const firstKey = api.submit.mock.calls[0][2];
    expect(store.pendingKey()).toBe(firstKey);

    api.submit.mockReturnValueOnce(throwError(() => new ApiError(422, 'Bad answer')));
    await expect(store.submit(dto)).rejects.toBeInstanceOf(ApiError);
    expect(api.submit.mock.calls[1][2]).toBe(firstKey);
    expect(store.pendingKey()).toBeNull();

    api.submit.mockReturnValueOnce(of({ id: 'r2', surveyId: 's1', submittedAt: 'now' }));
    await store.submit(dto);
    expect(api.submit.mock.calls[2][2]).not.toBe(firstKey);
  });
});
