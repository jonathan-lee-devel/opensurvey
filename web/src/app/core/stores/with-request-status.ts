import { computed } from '@angular/core';
import { signalStoreFeature, withComputed, withState } from '@ngrx/signals';

/** Where a store's current request stands; an object carries the failure's message. */
export type RequestStatus = 'idle' | 'pending' | 'fulfilled' | { readonly error: string };

export interface RequestStatusState {
  readonly requestStatus: RequestStatus;
}

/**
 * Adds `requestStatus` to a store with `isPending`, `isFulfilled` and `error`
 * computed from it. Pair with the `setPending()`, `setFulfilled()` and
 * `setError()` updaters inside `patchState()`.
 */
export function withRequestStatus() {
  return signalStoreFeature(
    withState<RequestStatusState>({ requestStatus: 'idle' }),
    withComputed(({ requestStatus }) => ({
      isPending: computed(() => requestStatus() === 'pending'),
      isFulfilled: computed(() => requestStatus() === 'fulfilled'),
      error: computed(() => {
        const status = requestStatus();
        return typeof status === 'object' ? status.error : null;
      }),
    })),
  );
}

export function setPending(): RequestStatusState {
  return { requestStatus: 'pending' };
}

export function setFulfilled(): RequestStatusState {
  return { requestStatus: 'fulfilled' };
}

export function setError(error: string): RequestStatusState {
  return { requestStatus: { error } };
}
