import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { firstValueFrom, pipe, switchMap, tap } from 'rxjs';

import { describeError } from '../api/api-error';
import { AdminUsersService } from '../api/admin-users.service';
import { AdminUser, CreateUserDto, ListUsersQuery } from '../api/models';
import { setError, setFulfilled, setPending, withRequestStatus } from './with-request-status';
import { ToastsStore } from './toasts.store';

interface UsersState {
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  /**
   * Every user, for the owner pickers on the survey and poll forms; loaded
   * separately so the pickers do not disturb the list's paging.
   */
  readonly ownerOptions: readonly AdminUser[];
}

const initialState: UsersState = {
  total: 0,
  limit: 20,
  offset: 0,
  ownerOptions: [],
};

/** The most users a picker lists; the API caps a page at 200. */
const OWNER_OPTIONS_LIMIT = 200;

/** The paged user list behind `/admin/users`, plus the owner picker's options. */
export const UsersStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withEntities<AdminUser>(),
  withRequestStatus(),
  withComputed(({ limit, offset }) => ({
    query: computed((): ListUsersQuery => ({ limit: limit(), offset: offset() })),
  })),
  withMethods((store) => {
    const users = inject(AdminUsersService);
    const toasts = inject(ToastsStore);

    const load = rxMethod<ListUsersQuery>(
      pipe(
        tap(() => patchState(store, setPending())),
        switchMap((query) =>
          users.list(query).pipe(
            tapResponse({
              next: ({ items, total }) =>
                patchState(store, setAllEntities([...items]), { total }, setFulfilled()),
              error: (error) => patchState(store, setError(describeError(error))),
            }),
          ),
        ),
      ),
    );

    const loadOwnerOptions = rxMethod<void>(
      pipe(
        switchMap(() =>
          users.list({ limit: OWNER_OPTIONS_LIMIT, offset: 0 }).pipe(
            tapResponse({
              next: ({ items }) => patchState(store, { ownerOptions: items }),
              error: (error) => toasts.error(describeError(error)),
            }),
          ),
        ),
      ),
    );

    return {
      load,
      loadOwnerOptions,

      reload(): void {
        load(store.query());
      },

      setPage(limit: number, offset: number): void {
        patchState(store, { limit, offset });
      },

      /** Creates a user and refreshes the list; rejects with the `ApiError` for the form. */
      async create(dto: CreateUserDto): Promise<AdminUser> {
        const created = await firstValueFrom(users.create(dto));
        toasts.success(`User ${created.email} created.`);
        patchState(store, { offset: 0 });
        load(store.query());
        return created;
      },
    };
  }),
);
