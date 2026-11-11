import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { firstValueFrom, pipe, switchMap, tap } from 'rxjs';

import { describeError } from '../api/api-error';
import { AdminPollsService } from '../api/admin-polls.service';
import { AdminPoll, UpdatePollDto } from '../api/models';
import { setError, setFulfilled, setPending, withRequestStatus } from './with-request-status';
import { ToastsStore } from './toasts.store';

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
    const toasts = inject(ToastsStore);

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

      /** Changes the poll's own fields or status and keeps the loaded copy in step. */
      async update(dto: UpdatePollDto): Promise<AdminPoll> {
        const id = store.pollId();
        if (!id) throw new Error('No poll selected');
        const poll = await firstValueFrom(polls.update(id, dto));
        patchState(store, { poll });
        toasts.success(dto.status ? `Poll is now ${dto.status}.` : 'Poll updated.');
        return poll;
      },

      /** Deletes the loaded poll; the page navigates away afterwards. */
      async remove(): Promise<void> {
        const id = store.pollId();
        if (!id) throw new Error('No poll selected');
        await firstValueFrom(polls.remove(id));
        patchState(store, { pollId: null, poll: null });
        toasts.success('Poll deleted.');
      },
    };
  }),
);
