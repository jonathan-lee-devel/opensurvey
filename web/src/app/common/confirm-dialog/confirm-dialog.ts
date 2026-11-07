import { Component, ElementRef, input, signal, viewChild } from '@angular/core';

/**
 * A native `<dialog>` asking the user to confirm something irreversible.
 * Call `open()` and await the answer; focus moves into the dialog and back.
 */
@Component({
  selector: 'app-confirm-dialog',
  template: `
    <dialog
      #dialog
      class="confirm"
      [attr.aria-labelledby]="'confirm-title-' + uid"
      [attr.aria-describedby]="'confirm-text-' + uid"
      (close)="settle(dialog.returnValue === 'confirm')"
      (cancel)="settle(false)"
    >
      <form method="dialog" class="confirm__form">
        <h2 class="confirm__title" [id]="'confirm-title-' + uid">{{ title() }}</h2>
        <p class="confirm__text" [id]="'confirm-text-' + uid">{{ message() }}</p>
        <div class="confirm__actions">
          <button type="submit" value="cancel" class="btn btn--ghost" autofocus>Cancel</button>
          <button
            type="submit"
            value="confirm"
            class="btn"
            [class.btn--danger]="danger()"
            [class.btn--primary]="!danger()"
          >
            {{ confirmLabel() }}
          </button>
        </div>
      </form>
    </dialog>
  `,
  styles: `
    .confirm {
      width: min(28rem, calc(100vw - 2rem));
      padding: 0;
      border: 1px solid var(--border-color-strong);
      border-radius: var(--radius-lg);
      background: var(--background-1dp);
      color: var(--color);
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.3);
    }

    .confirm::backdrop {
      background: rgba(0, 0, 0, 0.45);
    }

    .confirm__form {
      display: grid;
      gap: 12px;
      padding: 24px;
    }

    .confirm__title {
      font-size: 1.125rem;
    }

    .confirm__actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 8px;
    }
  `,
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly danger = input(false);

  protected readonly uid = Math.random().toString(36).slice(2, 8);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly pending = signal<((confirmed: boolean) => void) | null>(null);

  /** Shows the dialog; resolves true only when the confirm button was used. */
  open(): Promise<boolean> {
    return new Promise((resolve) => {
      this.pending.set(resolve);
      this.dialog().nativeElement.showModal();
    });
  }

  protected settle(confirmed: boolean): void {
    const resolve = this.pending();
    this.pending.set(null);
    resolve?.(confirmed);
  }
}
