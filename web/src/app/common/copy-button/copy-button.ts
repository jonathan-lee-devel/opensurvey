import { Component, inject, input, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/** Copies `value` to the clipboard and confirms it in the button itself. */
@Component({
  selector: 'app-copy-button',
  template: `
    <button
      type="button"
      class="btn btn--ghost btn--sm"
      [attr.aria-label]="'Copy ' + label()"
      (click)="copy()"
    >
      @if (copied()) {
        Copied
      } @else {
        Copy
      }
    </button>
  `,
})
export class CopyButton {
  readonly value = input.required<string>();
  readonly label = input('to clipboard');

  protected readonly copied = signal(false);
  private readonly document = inject(DOCUMENT);

  protected async copy(): Promise<void> {
    const clipboard = this.document.defaultView?.navigator.clipboard;
    if (!clipboard) return;
    try {
      await clipboard.writeText(this.value());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      this.copied.set(false);
    }
  }
}
