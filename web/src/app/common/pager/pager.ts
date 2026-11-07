import { Component, computed, input, output } from '@angular/core';

export interface PageChange {
  readonly limit: number;
  readonly offset: number;
}

export const PAGE_SIZES: readonly number[] = [10, 20, 50, 100];

/** Previous/next paging over an offset-based list, with a page size select. */
@Component({
  selector: 'app-pager',
  template: `
    <nav class="pager" aria-label="Pagination">
      <p class="pager__summary" aria-live="polite">
        @if (total() === 0) {
          No items
        } @else {
          Showing <strong>{{ first() }}–{{ last() }}</strong> of <strong>{{ total() }}</strong>
        }
      </p>
      <div class="pager__controls">
        <label class="pager__size">
          <span>Per page</span>
          <select class="select" [value]="limit()" (change)="onSizeChange($event)">
            @for (size of pageSizes; track size) {
              <option [value]="size">{{ size }}</option>
            }
          </select>
        </label>
        <button
          type="button"
          class="btn btn--ghost btn--sm"
          [disabled]="!hasPrevious()"
          (click)="previous()"
        >
          Previous
        </button>
        <button
          type="button"
          class="btn btn--ghost btn--sm"
          [disabled]="!hasNext()"
          (click)="next()"
        >
          Next
        </button>
      </div>
    </nav>
  `,
  styles: `
    .pager {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px 16px;
      padding: 12px 0 0;
      font-size: 0.9rem;
      color: var(--color-muted);
    }

    .pager__summary strong {
      color: var(--color-1dp);
      font-variant-numeric: tabular-nums;
    }

    .pager__controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pager__size {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-right: 8px;
    }

    .pager__size .select {
      width: auto;
      padding: 6px 8px;
    }
  `,
})
export class Pager {
  readonly total = input.required<number>();
  readonly limit = input.required<number>();
  readonly offset = input.required<number>();
  readonly pageChange = output<PageChange>();

  protected readonly pageSizes = PAGE_SIZES;
  protected readonly first = computed(() => Math.min(this.offset() + 1, this.total()));
  protected readonly last = computed(() => Math.min(this.offset() + this.limit(), this.total()));
  protected readonly hasPrevious = computed(() => this.offset() > 0);
  protected readonly hasNext = computed(() => this.offset() + this.limit() < this.total());

  protected previous(): void {
    this.pageChange.emit({
      limit: this.limit(),
      offset: Math.max(0, this.offset() - this.limit()),
    });
  }

  protected next(): void {
    this.pageChange.emit({ limit: this.limit(), offset: this.offset() + this.limit() });
  }

  protected onSizeChange(event: Event): void {
    const limit = Number((event.target as HTMLSelectElement).value);
    this.pageChange.emit({ limit, offset: 0 });
  }
}
