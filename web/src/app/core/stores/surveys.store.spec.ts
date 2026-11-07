import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AdminSurveysService } from '../api/admin-surveys.service';
import { ApiError } from '../api/api-error';
import { AdminSurveySummary } from '../api/models';
import { SurveysStore } from './surveys.store';
import { ToastsStore } from './toasts.store';

const survey: AdminSurveySummary = {
  id: 's1',
  ownerId: 'u1',
  title: 'First',
  description: null,
  slug: 'first',
  status: 'draft',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('SurveysStore', () => {
  const api = { list: vi.fn(), create: vi.fn() };

  beforeEach(() => {
    api.list.mockReset();
    api.create.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: AdminSurveysService, useValue: api }],
    });
  });

  it('loads the page described by its query and refetches when the filter changes', () => {
    api.list.mockReturnValue(of({ items: [survey], total: 1 }));
    const store = TestBed.inject(SurveysStore);
    TestBed.runInInjectionContext(() => store.load(store.query));
    TestBed.tick();

    expect(api.list).toHaveBeenCalledWith({ limit: 20, offset: 0, status: undefined });
    expect(store.entities()).toEqual([survey]);
    expect(store.total()).toBe(1);
    expect(store.isFulfilled()).toBe(true);

    store.setStatusFilter('published');
    TestBed.tick();
    expect(api.list).toHaveBeenLastCalledWith({ limit: 20, offset: 0, status: 'published' });

    store.setPage(50, 100);
    TestBed.tick();
    expect(api.list).toHaveBeenLastCalledWith({ limit: 50, offset: 100, status: 'published' });
  });

  it('records the failure message so the page can offer a retry', () => {
    api.list.mockReturnValue(throwError(() => new ApiError(500, 'The API hit an error.')));
    const store = TestBed.inject(SurveysStore);
    TestBed.runInInjectionContext(() => store.load(store.query));
    TestBed.tick();

    expect(store.error()).toBe('The API hit an error.');
    expect(store.isPending()).toBe(false);
  });

  it('creates a survey, toasts, and reloads the list', async () => {
    api.list.mockReturnValue(of({ items: [], total: 0 }));
    api.create.mockReturnValue(of({ ...survey, questions: [] }));
    const store = TestBed.inject(SurveysStore);
    const toasts = TestBed.inject(ToastsStore);
    TestBed.runInInjectionContext(() => store.load(store.query));
    TestBed.tick();
    api.list.mockClear();

    const created = await store.create({
      ownerId: 'u1',
      title: 'First',
      description: null,
      slug: 'first',
      status: 'draft',
      questions: [{ type: 'short_text', prompt: 'Q', required: false }],
    });

    expect(created.id).toBe('s1');
    expect(toasts.toasts().map((t) => t.kind)).toEqual(['success']);
    expect(api.list).toHaveBeenCalledTimes(1);
  });

  it('rejects create with the ApiError so a form can place field errors', async () => {
    api.create.mockReturnValue(
      throwError(() => new ApiError(409, 'A survey with this slug exists.')),
    );
    const store = TestBed.inject(SurveysStore);
    await expect(
      store.create({
        ownerId: 'u1',
        title: 'T',
        description: null,
        slug: 't',
        status: 'draft',
        questions: [],
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
