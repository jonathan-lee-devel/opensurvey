import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AdminPollsService } from './admin-polls.service';
import { AdminSurveysService } from './admin-surveys.service';
import { AdminUsersService } from './admin-users.service';

describe('list and mutate endpoints', () => {
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('AdminPollsService lists with a status filter and fetches by id', () => {
    const polls = TestBed.inject(AdminPollsService);
    polls.list({ limit: 5, status: 'closed' }).subscribe();
    const list = backend.expectOne((r) => r.url === '/api/admin/polls');
    expect(list.request.params.get('limit')).toBe('5');
    expect(list.request.params.get('status')).toBe('closed');
    list.flush({ items: [], total: 0 });

    polls.findById('p1').subscribe();
    backend.expectOne({ method: 'GET', url: '/api/admin/polls/p1' }).flush({});
  });

  it('AdminPollsService patches and deletes by id', () => {
    const polls = TestBed.inject(AdminPollsService);
    polls.update('p1', { status: 'closed', closesAt: null }).subscribe();
    const patch = backend.expectOne({ method: 'PATCH', url: '/api/admin/polls/p1' });
    expect(patch.request.body).toEqual({ status: 'closed', closesAt: null });
    patch.flush({});

    polls.remove('p1').subscribe();
    backend.expectOne({ method: 'DELETE', url: '/api/admin/polls/p1' }).flush(null, {
      status: 204,
      statusText: 'No Content',
    });
  });

  it('AdminUsersService lists with paging only', () => {
    TestBed.inject(AdminUsersService).list({ offset: 40 }).subscribe();
    const list = backend.expectOne((r) => r.url === '/api/admin/users');
    expect(list.request.params.keys()).toEqual(['offset']);
    list.flush({ items: [], total: 0 });
  });

  it('AdminSurveysService patches and deletes by id', () => {
    const surveys = TestBed.inject(AdminSurveysService);
    surveys.update('s1', { status: 'closed' }).subscribe();
    const patch = backend.expectOne({ method: 'PATCH', url: '/api/admin/surveys/s1' });
    expect(patch.request.body).toEqual({ status: 'closed' });
    patch.flush({});

    surveys.remove('s1').subscribe();
    backend.expectOne({ method: 'DELETE', url: '/api/admin/surveys/s1' }).flush(null, {
      status: 204,
      statusText: 'No Content',
    });
  });
});
