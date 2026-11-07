import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';

import { ApiError } from '../api/api-error';
import { SLUG_PATTERN, nullIfBlank, slugify, toSubmitErrors } from './form-utils';

describe('slugify', () => {
  it('produces something the API slug rule accepts', () => {
    for (const text of [
      'Customer Satisfaction 2026!',
      '  Ünïcödé — test  ',
      'a--b__c',
      'x'.repeat(80),
    ]) {
      const slug = slugify(text);
      expect(slug).toMatch(SLUG_PATTERN);
      expect(slug.length).toBeLessThanOrEqual(64);
    }
    expect(slugify('Customer Satisfaction 2026!')).toBe('customer-satisfaction-2026');
    expect(slugify('Ünïcödé test')).toBe('unicode-test');
  });

  it('returns an empty string when nothing usable is left', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('nullIfBlank', () => {
  it('trims and nulls empty text', () => {
    expect(nullIfBlank('  hi ')).toBe('hi');
    expect(nullIfBlank('   ')).toBeNull();
  });
});

describe('toSubmitErrors', () => {
  const makeForm = () =>
    TestBed.runInInjectionContext(() => form(signal({ slug: '', ownerId: '', title: '' })));

  it('places validation messages on the fields their path names', () => {
    const f = makeForm();
    const errors = toSubmitErrors(new ApiError(400, '2 fields', { slug: 'bad', nope: 'unknown' }), {
      fieldFor: (path) => (path === 'slug' ? f.slug : undefined),
    });
    expect(errors).toEqual([
      { kind: 'server', message: 'bad', fieldTree: f.slug },
      { kind: 'server', message: 'nope: unknown' },
    ]);
  });

  it('places a status-only answer on the field configured for that status', () => {
    const f = makeForm();
    expect(toSubmitErrors(new ApiError(409, 'Taken.'), { byStatus: { 409: f.slug } })).toEqual([
      { kind: 'server', message: 'Taken.', fieldTree: f.slug },
    ]);
    expect(toSubmitErrors(new ApiError(500, 'Down.'), { byStatus: { 409: f.slug } })).toEqual([
      { kind: 'server', message: 'Down.' },
    ]);
  });

  it('gives unknown failures a generic root error', () => {
    expect(toSubmitErrors(new TypeError('x'))).toEqual([
      { kind: 'server', message: 'Something went wrong. Try again.' },
    ]);
  });
});
