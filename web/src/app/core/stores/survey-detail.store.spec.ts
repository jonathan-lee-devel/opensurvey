import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminSurveysService } from '../api/admin-surveys.service';
import { AdminSurvey } from '../api/models';
import { SurveyDetailStore } from './survey-detail.store';
import { ToastsStore } from './toasts.store';

const survey: AdminSurvey = {
  id: 's1',
  ownerId: 'u1',
  title: 'First',
  description: null,
  slug: 'first',
  status: 'draft',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  questions: [],
};

describe('SurveyDetailStore', () => {
  const api = {
    findById: vi.fn(),
    listSubmissions: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset();
    api.findById.mockReturnValue(of(survey));
    api.listSubmissions.mockReturnValue(of({ items: [], total: 0 }));
    TestBed.configureTestingModule({
      providers: [SurveyDetailStore, { provide: AdminSurveysService, useValue: api }],
    });
  });

  const loaded = () => {
    const store = TestBed.inject(SurveyDetailStore);
    TestBed.runInInjectionContext(() => store.load(store.query));
    store.select('s1');
    TestBed.tick();
    return store;
  };

  it('fetches the survey once per id and the submissions on every page change', () => {
    const store = loaded();
    expect(store.survey()).toEqual(survey);
    expect(api.findById).toHaveBeenCalledTimes(1);

    store.setPage(10, 10);
    TestBed.tick();
    expect(api.findById).toHaveBeenCalledTimes(1);
    expect(api.listSubmissions).toHaveBeenLastCalledWith('s1', { limit: 10, offset: 10 });
  });

  it('update patches the loaded survey without refetching', async () => {
    const store = loaded();
    api.update.mockReturnValue(of({ ...survey, status: 'published' }));

    await store.update({ status: 'published' });

    expect(api.update).toHaveBeenCalledWith('s1', { status: 'published' });
    expect(store.survey()?.status).toBe('published');
    expect(api.findById).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(ToastsStore).toasts()[0].message).toContain('published');
  });

  it('remove deletes through the API and clears the selection', async () => {
    const store = loaded();
    api.remove.mockReturnValue(of(undefined));

    await store.remove();

    expect(api.remove).toHaveBeenCalledWith('s1');
    expect(store.survey()).toBeNull();
    expect(store.surveyId()).toBeNull();
  });
});
