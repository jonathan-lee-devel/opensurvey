import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { forkJoin, pipe, switchMap, tap } from 'rxjs';

import { describeError } from '../api/api-error';
import { AdminSurveysService } from '../api/admin-surveys.service';
import { AdminSubmission, AdminSurvey, ListSubmissionsQuery } from '../api/models';
import { setError, setFulfilled, setPending, withRequestStatus } from './with-request-status';

interface SurveyDetailState {
  readonly surveyId: string | null;
  readonly survey: AdminSurvey | null;
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

const initialState: SurveyDetailState = {
  surveyId: null,
  survey: null,
  total: 0,
  limit: 20,
  offset: 0,
};

/** What `load()` reacts to: which survey, and which page of its submissions. */
export interface SurveyDetailQuery extends ListSubmissionsQuery {
  readonly surveyId: string;
}

/**
 * One survey with a page of its submissions. Provided on the detail route, not
 * in root, so each visit starts clean and the entities hold submissions only.
 */
export const SurveyDetailStore = signalStore(
  withState(initialState),
  withEntities<AdminSubmission>(),
  withRequestStatus(),
  withComputed(({ surveyId, limit, offset }) => ({
    query: computed((): SurveyDetailQuery | null => {
      const id = surveyId();
      return id ? { surveyId: id, limit: limit(), offset: offset() } : null;
    }),
  })),
  withMethods((store) => {
    const surveys = inject(AdminSurveysService);

    const load = rxMethod<SurveyDetailQuery | null>(
      pipe(
        tap(() => patchState(store, setPending())),
        switchMap((query) => {
          if (!query) {
            patchState(
              store,
              { survey: null },
              setAllEntities<AdminSubmission>([]),
              setFulfilled(),
            );
            return [];
          }
          const { surveyId, ...page } = query;
          // The survey itself only needs fetching once per id; submissions on
          // every page change. Fetch both when the id changed, else just the page.
          const current = store.survey();
          const survey$ =
            current && current.id === surveyId ? [current] : surveys.findById(surveyId);
          return forkJoin({
            survey: survey$,
            submissions: surveys.listSubmissions(surveyId, page),
          }).pipe(
            tapResponse({
              next: ({ survey, submissions }) =>
                patchState(
                  store,
                  { survey, total: submissions.total },
                  setAllEntities([...submissions.items]),
                  setFulfilled(),
                ),
              error: (error) => patchState(store, setError(describeError(error))),
            }),
          );
        }),
      ),
    );

    return {
      load,

      /** Selects the survey to show; resets paging when it changes. */
      select(surveyId: string): void {
        if (store.surveyId() !== surveyId) {
          patchState(store, { surveyId, offset: 0, survey: null });
        }
      },

      setPage(limit: number, offset: number): void {
        patchState(store, { limit, offset });
      },

      reload(): void {
        load(store.query());
      },
    };
  }),
);
