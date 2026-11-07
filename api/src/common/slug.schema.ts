import { z } from 'zod';

/** The short identifier in a public link: lowercase words joined by single hyphens. */
export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'must be lowercase letters and digits separated by single hyphens',
  );
