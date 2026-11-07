import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { firstValueFrom, forkJoin, pipe, switchMap, tap } from 'rxjs';

import { describeError } from '../api/api-error';
import { AdminSurveysService } from '../api/admin-surveys.service';
import { AdminSubmission, AdminSurvey, ListSubmissionsQuery, UpdateSurveyDto } from '../api/models';
import { setError, setFulfilled, setPending, withRequestStatus } from './with-request-status';
import { ToastsStore } from './toasts.store';

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
    const toasts = inject(ToastsStore);

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

      /**
       * Changes the survey's own fields or status and keeps the loaded copy in
       * step. Rejects with the `ApiError` so a form can place field errors.
       */
      async update(dto: UpdateSurveyDto): Promise<AdminSurvey> {
        const id = store.surveyId();
        if (!id) throw new Error('No survey selected');
        const survey = await firstValueFrom(surveys.update(id, dto));
        patchState(store, { survey });
        toasts.success(dto.status ? `Survey is now ${dto.status}.` : 'Survey updated.');
        return survey;
      },

      /** Deletes the loaded survey; the page navigates away afterwards. */
      async remove(): Promise<void> {
        const id = store.surveyId();
        const title = store.survey()?.title ?? 'Survey';
        if (!id) throw new Error('No survey selected');
        await firstValueFrom(surveys.remove(id));
        patchState(store, { surveyId: null, survey: null });
        toasts.success(`“${title}” deleted.`);
      },
    };
  }),
);
