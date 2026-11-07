import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageChange, Pager } from './pager';

@Component({
  imports: [Pager],
  template: `<app-pager
    [total]="total()"
    [limit]="limit()"
    [offset]="offset()"
    (pageChange)="last.set($event)"
  />`,
})
class Host {
  readonly total = signal(45);
  readonly limit = signal(20);
  readonly offset = signal(20);
  readonly last = signal<PageChange | null>(null);
}

describe('Pager', () => {
  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;

  const button = (label: string) =>
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === label)!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  });

  it('summarises the visible range', () => {
    expect(el.textContent).toContain('21–40');
    expect(el.textContent).toContain('45');
  });

  it('emits the neighbouring pages and disables at the edges', async () => {
    button('Next').click();
    expect(fixture.componentInstance.last()).toEqual({ limit: 20, offset: 40 });
    button('Previous').click();
    expect(fixture.componentInstance.last()).toEqual({ limit: 20, offset: 0 });

    fixture.componentInstance.offset.set(40);
    await fixture.whenStable();
    expect(button('Next').disabled).toBe(true);

    fixture.componentInstance.offset.set(0);
    await fixture.whenStable();
    expect(button('Previous').disabled).toBe(true);
  });

  it('restarts from the first page when the page size changes', () => {
    const select = el.querySelector('select')!;
    select.value = '50';
    select.dispatchEvent(new Event('change'));
    expect(fixture.componentInstance.last()).toEqual({ limit: 50, offset: 0 });
  });
});
