import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AdminUsersService } from '../api/admin-users.service';
import { ApiError } from '../api/api-error';
import { AdminUser } from '../api/models';
import { ToastsStore } from './toasts.store';
import { UsersStore } from './users.store';

const user = (id: string): AdminUser => ({
  id,
  email: `${id}@example.com`,
  displayName: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('UsersStore', () => {
  const api = { list: vi.fn(), create: vi.fn() };

  beforeEach(() => {
    api.list.mockReset();
    api.create.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: AdminUsersService, useValue: api }],
    });
  });

  it('loads the page its query describes and refetches on paging', () => {
    api.list.mockReturnValue(of({ items: [user('a')], total: 1 }));
    const store = TestBed.inject(UsersStore);
    TestBed.runInInjectionContext(() => store.load(store.query));
    TestBed.tick();

    expect(api.list).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    expect(store.entities()).toEqual([user('a')]);
    expect(store.total()).toBe(1);

    store.setPage(50, 50);
    TestBed.tick();
    expect(api.list).toHaveBeenLastCalledWith({ limit: 50, offset: 50 });
  });

  it('loads the owner options separately from the paged list', () => {
    api.list.mockReturnValue(of({ items: [user('a'), user('b')], total: 2 }));
    const store = TestBed.inject(UsersStore);
    TestBed.runInInjectionContext(() => store.loadOwnerOptions());
    TestBed.tick();

    expect(api.list).toHaveBeenCalledWith({ limit: 200, offset: 0 });
    expect(store.ownerOptions().map((u) => u.id)).toEqual(['a', 'b']);
    expect(store.entities()).toEqual([]);
    expect(store.offset()).toBe(0);
  });

  it('creates a user, toasts, and reloads the first page', async () => {
    api.list.mockReturnValue(of({ items: [], total: 0 }));
    api.create.mockReturnValue(of(user('new')));
    const store = TestBed.inject(UsersStore);
    const toasts = TestBed.inject(ToastsStore);
    TestBed.runInInjectionContext(() => store.load(store.query));
    TestBed.tick();
    store.setPage(20, 40);
    TestBed.tick();
    api.list.mockClear();

    await store.create({ email: 'new@example.com' });

    expect(toasts.toasts().map((t) => t.kind)).toEqual(['success']);
    expect(store.offset()).toBe(0);
    expect(api.list).toHaveBeenCalledWith({ limit: 20, offset: 0 });
  });

  it('rejects create with the ApiError so a form can place field errors', async () => {
    api.create.mockReturnValue(throwError(() => new ApiError(409, 'Exists.')));
    const store = TestBed.inject(UsersStore);
    await expect(store.create({ email: 'dup@example.com' })).rejects.toBeInstanceOf(ApiError);
  });
});
