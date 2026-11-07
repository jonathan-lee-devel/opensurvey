import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { firstValueFrom, pipe, switchMap, tap } from 'rxjs';

import { describeError } from '../api/api-error';
import { AdminSurveysService } from '../api/admin-surveys.service';
import {
  AdminSurvey,
  AdminSurveySummary,
  CreateSurveyDto,
  ListSurveysQuery,
  PublishStatus,
} from '../api/models';
import { setError, setFulfilled, setPending, withRequestStatus } from './with-request-status';
import { ToastsStore } from './toasts.store';

interface SurveysState {
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly status: PublishStatus | null;
}

const initialState: SurveysState = {
  total: 0,
  limit: 20,
  offset: 0,
  status: null,
};

/**
 * The paged survey list behind `/admin/surveys`. `load()` is reactive: pass it
 * the `query` signal once and every filter or page change refetches.
 */
export const SurveysStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withEntities<AdminSurveySummary>(),
  withRequestStatus(),
  withComputed(({ limit, offset, status }) => ({
    query: computed((): ListSurveysQuery => ({
      limit: limit(),
      offset: offset(),
      status: status() ?? undefined,
    })),
  })),
  withMethods((store) => {
    const surveys = inject(AdminSurveysService);
    const toasts = inject(ToastsStore);

    const load = rxMethod<ListSurveysQuery>(
      pipe(
        tap(() => patchState(store, setPending())),
        switchMap((query) =>
          surveys.list(query).pipe(
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

      /** Refetches the current page, for a retry button. */
      reload(): void {
        load(store.query());
      },

      setStatusFilter(status: PublishStatus | null): void {
        patchState(store, { status, offset: 0 });
      },

      setPage(limit: number, offset: number): void {
        patchState(store, { limit, offset });
      },

      /**
       * Creates a survey and refreshes the list. Resolves with the new survey;
       * rejects with the `ApiError` so the form can place field errors.
       */
      async create(dto: CreateSurveyDto): Promise<AdminSurvey> {
        const created = await firstValueFrom(surveys.create(dto));
        toasts.success(`Survey “${created.title}” created.`);
        load(store.query());
        return created;
      },
    };
  }),
);
