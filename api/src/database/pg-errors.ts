/**
 * Reads the SQLSTATE code off a failed query. Drizzle wraps the driver's
 * `DatabaseError` in a `DrizzleQueryError` whose `cause` carries it, so this
 * walks a few levels of `cause` to find the first `code` string.
 */
export function pgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth++) {
    if (typeof current !== 'object' || current === null) return undefined;
    const { code, cause } = current as { code?: unknown; cause?: unknown };
    if (typeof code === 'string') return code;
    current = cause;
  }
  return undefined;
}

/** A UNIQUE constraint was violated, such as a duplicate slug or email. */
export const isUniqueViolation = (error: unknown): boolean =>
  pgErrorCode(error) === '23505';

/** A FOREIGN KEY constraint was violated, such as a missing owner. */
export const isForeignKeyViolation = (error: unknown): boolean =>
  pgErrorCode(error) === '23503';
