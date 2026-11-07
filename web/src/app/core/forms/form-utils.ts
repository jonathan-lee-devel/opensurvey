import { FieldTree, ValidationError } from '@angular/forms/signals';

import { isApiError } from '../api/api-error';

/** The API's slug rule (`api/src/common/slug.schema.ts`): lowercase words joined by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A slug suggestion from free text: ASCII letters and digits, hyphen-separated, at most 64 characters. */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/, '');
}

/** Trimmed text, or null when nothing is left; for the API's nullable strings. */
export function nullIfBlank(text: string): string | null {
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Turns a failed API call into Signal Forms submit errors. Field errors from
 * the validation pipe land on the field whose request path `fieldFor` resolves;
 * `byStatus` places a status-only answer (a 409 on the slug, say); anything
 * else becomes one error on the form root.
 */
export function toSubmitErrors(
  error: unknown,
  options: {
    readonly fieldFor?: (path: string) => FieldTree<unknown> | undefined;
    readonly byStatus?: Readonly<Record<number, FieldTree<unknown>>>;
  } = {},
): ValidationError.WithOptionalFieldTree[] {
  if (!isApiError(error)) {
    return [{ kind: 'server', message: 'Something went wrong. Try again.' }];
  }
  const errors: ValidationError.WithOptionalFieldTree[] = [];
  for (const [path, message] of Object.entries(error.fieldErrors)) {
    const fieldTree = options.fieldFor?.(path);
    errors.push(
      fieldTree
        ? { kind: 'server', message, fieldTree }
        : { kind: 'server', message: `${path}: ${message}` },
    );
  }
  if (errors.length > 0) return errors;
  const target = options.byStatus?.[error.status];
  return [
    target
      ? { kind: 'server', message: error.message, fieldTree: target }
      : { kind: 'server', message: error.message },
  ];
}
