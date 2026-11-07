import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { firstValueFrom, pipe, switchMap, tap } from 'rxjs';

import { describeError, isApiError } from '../api/api-error';
import { CreateSubmissionDto, PublicSubmission, PublicSurvey } from '../api/models';
import { PublicSurveysService } from '../api/public-surveys.service';
import { setError, setFulfilled, setPending, withRequestStatus } from './with-request-status';

interface PublicSurveyState {
  readonly slug: string | null;
  readonly survey: PublicSurvey | null;
  /** The API's receipt once the answers are in. */
  readonly receipt: PublicSubmission | null;
  /**
   * The Idempotency-Key of an attempt that did not reach a verdict (network
   * failure, 5xx): the next submit resends it, so a retry can never record
   * the answers twice. Any other outcome starts a fresh attempt.
   */
  readonly pendingKey: string | null;
}

const initialState: PublicSurveyState = {
  slug: null,
  survey: null,
  receipt: null,
  pendingKey: null,
};

/** A published survey being answered. Provided on the public route. */
export const PublicSurveyStore = signalStore(
  withState(initialState),
  withRequestStatus(),
  withMethods((store) => {
    const surveys = inject(PublicSurveysService);

    const load = rxMethod<string | null>(
      pipe(
        tap(() => patchState(store, setPending())),
        switchMap((slug) => {
          if (!slug) {
            patchState(store, { survey: null }, setFulfilled());
            return [];
          }
          return surveys.findBySlug(slug).pipe(
            tapResponse({
              next: (survey) => patchState(store, { survey }, setFulfilled()),
              error: (error) => patchState(store, setError(describeError(error))),
            }),
          );
        }),
      ),
    );

    return {
      load,

      select(slug: string): void {
        if (store.slug() !== slug) {
          patchState(store, { slug, survey: null, receipt: null, pendingKey: null });
        }
      },

      reload(): void {
        load(store.slug());
      },

      /** Sends the answers; rejects with the `ApiError` so the form can show it. */
      async submit(dto: CreateSubmissionDto): Promise<PublicSubmission> {
        const slug = store.slug();
        if (!slug) throw new Error('No survey selected');
        const key = store.pendingKey() ?? globalThis.crypto.randomUUID();
        try {
          const receipt = await firstValueFrom(surveys.submit(slug, dto, key));
          patchState(store, { receipt, pendingKey: null });
          return receipt;
        } catch (error) {
          const undecided = isApiError(error) && (error.status === 0 || error.status >= 500);
          patchState(store, { pendingKey: undecided ? key : null });
          throw error;
        }
      },
    };
  }),
);
