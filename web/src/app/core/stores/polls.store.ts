import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { firstValueFrom, pipe, switchMap, tap } from 'rxjs';

import { describeError } from '../api/api-error';
import { AdminPollsService } from '../api/admin-polls.service';
import {
  AdminPoll,
  AdminPollSummary,
  CreatePollDto,
  ListPollsQuery,
  PublishStatus,
} from '../api/models';
import { setError, setFulfilled, setPending, withRequestStatus } from './with-request-status';
import { ToastsStore } from './toasts.store';

interface PollsState {
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly status: PublishStatus | null;
}

const initialState: PollsState = {
  total: 0,
  limit: 20,
  offset: 0,
  status: null,
};

/** The paged poll list behind `/admin/polls`; `load()` reacts to the `query` signal. */
export const PollsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withEntities<AdminPollSummary>(),
  withRequestStatus(),
  withComputed(({ limit, offset, status }) => ({
    query: computed((): ListPollsQuery => ({
      limit: limit(),
      offset: offset(),
      status: status() ?? undefined,
    })),
  })),
  withMethods((store) => {
    const polls = inject(AdminPollsService);
    const toasts = inject(ToastsStore);

    const load = rxMethod<ListPollsQuery>(
      pipe(
        tap(() => patchState(store, setPending())),
        switchMap((query) =>
          polls.list(query).pipe(
            tapResponse({
              next: ({ items, total }) =>
                patchState(store, setAllEntities([...items]), { total }, setFulfilled()),
              error: (error) => patchState(store, setError(describeError(error))),
            }),
          ),
        ),
      ),
    );

    return {
      load,

      reload(): void {
        load(store.query());
      },

      setStatusFilter(status: PublishStatus | null): void {
        patchState(store, { status, offset: 0 });
      },

      setPage(limit: number, offset: number): void {
        patchState(store, { limit, offset });
      },

      /** Creates a poll; rejects with the `ApiError` so the form can place field errors. */
      async create(dto: CreatePollDto): Promise<AdminPoll> {
        const created = await firstValueFrom(polls.create(dto));
        toasts.success('Poll created.');
        return created;
      },
    };
  }),
);
