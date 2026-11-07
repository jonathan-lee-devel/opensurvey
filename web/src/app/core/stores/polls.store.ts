import { inject } from '@angular/core';
import { signalStore, patchState, withMethods } from '@ngrx/signals';
import { prependEntity, withEntities } from '@ngrx/signals/entities';
import { firstValueFrom } from 'rxjs';

import { AdminPollsService } from '../api/admin-polls.service';
import { AdminPoll, CreatePollDto } from '../api/models';
import { ToastsStore } from './toasts.store';

/**
 * Polls known to this session. As with users, the API only creates polls so
 * far; the entities are what was created here until a list endpoint exists.
 */
export const PollsStore = signalStore(
  { providedIn: 'root' },
  withEntities<AdminPoll>(),
  withMethods((store) => {
    const polls = inject(AdminPollsService);
    const toasts = inject(ToastsStore);

    return {
      /** Creates a poll; rejects with the `ApiError` so the form can place field errors. */
      async create(dto: CreatePollDto): Promise<AdminPoll> {
        const created = await firstValueFrom(polls.create(dto));
        patchState(store, prependEntity(created));
        toasts.success('Poll created.');
        return created;
      },
    };
  }),
);
