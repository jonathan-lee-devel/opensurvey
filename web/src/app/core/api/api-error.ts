import { HttpErrorResponse } from '@angular/common/http';

/**
 * What the API answers with on failure: NestJS's default exception body. The
 * validation pipe sends `message` as an array with one `"<path>: <issue>"`
 * entry per Zod issue; everything else sends a single string.
 */
interface NestErrorBody {
  readonly statusCode?: number;
  readonly message?: string | readonly string[];
  readonly error?: string;
}

/**
 * A failed API call, normalised so stores and forms can react without knowing
 * HTTP. `fieldErrors` maps a request path (`slug`, `questions.0.options`) to
 * its message when the API said which field was wrong.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors: Readonly<Record<string, string>> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromResponse(response: HttpErrorResponse): ApiError {
    if (response.status === 0) {
      return new ApiError(0, 'The API could not be reached. Check your connection and try again.');
    }
    const body = isNestErrorBody(response.error) ? response.error : {};
    if (Array.isArray(body.message)) {
      const fieldErrors: Record<string, string> = {};
      for (const entry of body.message) {
        const [path, ...rest] = entry.split(': ');
        if (rest.length > 0) {
          fieldErrors[path] = rest.join(': ');
        }
      }
      const summary =
        body.message.length === 1
          ? body.message[0]
          : `${body.message.length} fields need attention.`;
      return new ApiError(response.status, summary, fieldErrors);
    }
    const message =
      typeof body.message === 'string' && body.message.length > 0
        ? body.message
        : fallbackMessage(response.status);
    return new ApiError(response.status, message);
  }

  /** True when this error says the signed-in user may not do this. */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** Turns whatever a store caught into a message fit for a toast. */
export function describeError(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong.';
}

function isNestErrorBody(value: unknown): value is NestErrorBody {
  return typeof value === 'object' && value !== null;
}

function fallbackMessage(status: number): string {
  switch (status) {
    case 401:
      return 'Your session has expired. Sign in again.';
    case 403:
      return 'You do not have permission to do this.';
    case 404:
      return 'Not found.';
    case 409:
      return 'This conflicts with something that already exists.';
    case 429:
      return 'Too many requests. Wait a moment and try again.';
    default:
      return status >= 500
        ? 'The API hit an error. Try again later.'
        : `Request failed (${status}).`;
  }
}
