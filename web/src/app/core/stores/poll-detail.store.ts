import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, switchMap, tap } from 'rxjs';

import { describeError } from '../api/api-error';
import { AdminPollsService } from '../api/admin-polls.service';
import { AdminPoll } from '../api/models';
import { setError, setFulfilled, setPending, withRequestStatus } from './with-request-status';

interface PollDetailState {
  readonly pollId: string | null;
  readonly poll: AdminPoll | null;
}

/** One poll with its options. Provided on the detail route so each visit starts clean. */
export const PollDetailStore = signalStore(
  withState<PollDetailState>({ pollId: null, poll: null }),
  withRequestStatus(),
  withMethods((store) => {
    const polls = inject(AdminPollsService);

    const load = rxMethod<string | null>(
      pipe(
        tap(() => patchState(store, setPending())),
        switchMap((id) => {
          if (!id) {
            patchState(store, { poll: null }, setFulfilled());
            return [];
          }
          return polls.findById(id).pipe(
            tapResponse({
              next: (poll) => patchState(store, { poll }, setFulfilled()),
              error: (error) => patchState(store, setError(describeError(error))),
            }),
          );
        }),
      ),
    );

    return {
      load,

      select(pollId: string): void {
        if (store.pollId() !== pollId) {
          patchState(store, { pollId, poll: null });
        }
      },

      reload(): void {
        load(store.pollId());
      },
    };
  }),
);
