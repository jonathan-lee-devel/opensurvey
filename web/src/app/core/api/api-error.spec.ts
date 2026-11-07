import { HttpErrorResponse } from '@angular/common/http';

import { ApiError, describeError } from './api-error';

function response(status: number, error: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error, url: '/api/admin/surveys' });
}

describe('ApiError.fromResponse', () => {
  it('splits the validation pipe messages into field errors', () => {
    const error = ApiError.fromResponse(
      response(400, {
        statusCode: 400,
        message: [
          'slug: must be lowercase',
          'questions.0.options: required for single_choice questions',
        ],
        error: 'Bad Request',
      }),
    );
    expect(error.status).toBe(400);
    expect(error.fieldErrors).toEqual({
      slug: 'must be lowercase',
      'questions.0.options': 'required for single_choice questions',
    });
    expect(error.message).toBe('2 fields need attention.');
  });

  it('uses the single message as the summary', () => {
    const error = ApiError.fromResponse(
      response(400, { statusCode: 400, message: ['title: Too small'], error: 'Bad Request' }),
    );
    expect(error.message).toBe('title: Too small');
    expect(error.fieldErrors).toEqual({ title: 'Too small' });
  });

  it('keeps the API message of a plain error', () => {
    const error = ApiError.fromResponse(
      response(409, {
        statusCode: 409,
        message: 'A survey with this slug exists.',
        error: 'Conflict',
      }),
    );
    expect(error.status).toBe(409);
    expect(error.isConflict).toBe(true);
    expect(error.message).toBe('A survey with this slug exists.');
    expect(error.fieldErrors).toEqual({});
  });

  it('falls back to a message by status when the body has none', () => {
    expect(ApiError.fromResponse(response(403, null)).message).toContain('permission');
    expect(ApiError.fromResponse(response(404, '')).isNotFound).toBe(true);
    expect(ApiError.fromResponse(response(500, {})).message).toContain('Try again later');
  });

  it('explains a network failure', () => {
    const error = ApiError.fromResponse(response(0, new ProgressEvent('error')));
    expect(error.status).toBe(0);
    expect(error.message).toContain('could not be reached');
  });
});

describe('describeError', () => {
  it('prefers the ApiError message, then any Error, then a generic line', () => {
    expect(describeError(new ApiError(409, 'Taken.'))).toBe('Taken.');
    expect(describeError(new Error('boom'))).toBe('boom');
    expect(describeError('nope')).toBe('Something went wrong.');
  });
});
