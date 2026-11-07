import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  readonly id: number;
  readonly kind: ToastKind;
  readonly message: string;
}

interface ToastsState {
  readonly toasts: readonly Toast[];
}

/** How long a toast stays before it dismisses itself; errors stay until dismissed. */
const AUTO_DISMISS_MS = 6000;

/**
 * Short, transient messages shown by `app-toast-host`. Stores call `success()`
 * and `error()` after a request settles; nothing else needs to know how they
 * are shown.
 */
export const ToastsStore = signalStore(
  { providedIn: 'root' },
  withState<ToastsState>({ toasts: [] }),
  withMethods((store) => {
    let nextId = 1;

    const dismiss = (id: number): void => {
      patchState(store, ({ toasts }) => ({ toasts: toasts.filter((toast) => toast.id !== id) }));
    };

    const show = (kind: ToastKind, message: string): number => {
      const id = nextId++;
      patchState(store, ({ toasts }) => ({ toasts: [...toasts, { id, kind, message }] }));
      if (kind !== 'error') {
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      }
      return id;
    };

    return {
      dismiss,
      show,
      success: (message: string) => show('success', message),
      error: (message: string) => show('error', message),
      info: (message: string) => show('info', message),
    };
  }),
);
