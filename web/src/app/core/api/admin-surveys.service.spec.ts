import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AdminSurveysService } from './admin-surveys.service';

describe('AdminSurveysService', () => {
  let service: AdminSurveysService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminSurveysService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('lists surveys with only the paging and filter given', () => {
    service.list({ limit: 20, offset: 40, status: 'draft' }).subscribe();
    const paged = backend.expectOne((r) => r.url === '/api/admin/surveys');
    expect(paged.request.method).toBe('GET');
    expect(paged.request.params.get('limit')).toBe('20');
    expect(paged.request.params.get('offset')).toBe('40');
    expect(paged.request.params.get('status')).toBe('draft');
    paged.flush({ items: [], total: 0 });

    service.list().subscribe();
    const bare = backend.expectOne((r) => r.url === '/api/admin/surveys');
    expect(bare.request.params.keys()).toEqual([]);
    bare.flush({ items: [], total: 0 });
  });

  it('fetches one survey and its submissions by id', () => {
    service.findById('abc').subscribe();
    backend.expectOne({ method: 'GET', url: '/api/admin/surveys/abc' }).flush({});

    service.listSubmissions('abc', { limit: 10 }).subscribe();
    const request = backend.expectOne((r) => r.url === '/api/admin/surveys/abc/submissions');
    expect(request.request.params.get('limit')).toBe('10');
    expect(request.request.params.has('offset')).toBe(false);
    request.flush({ items: [], total: 0 });
  });

  it('posts a new survey as given', () => {
    const dto = {
      ownerId: '00000000-0000-0000-0000-000000000000',
      title: 'T',
      description: null,
      slug: 't',
      status: 'draft' as const,
      questions: [{ type: 'short_text' as const, prompt: 'Q', required: false }],
    };
    service.create(dto).subscribe();
    const request = backend.expectOne({ method: 'POST', url: '/api/admin/surveys' });
    expect(request.request.body).toEqual(dto);
    request.flush({});
  });
});
