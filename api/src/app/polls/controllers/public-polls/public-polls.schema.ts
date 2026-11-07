import { z } from 'zod';

import { publishStatus } from '../../../../database/schema/index.js';

export const pollSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .describe('Short identifier from the public link to the poll');

/** What anyone with the link may see about a published poll. */
export const publicPollSchema = z.object({
  id: z.uuid(),
  question: z.string(),
  slug: z.string(),
  status: z.enum(publishStatus.enumValues),
  closesAt: z.iso.datetime().nullable(),
  options: z.array(
    z.object({
      id: z.uuid(),
      label: z.string(),
      position: z.int().nonnegative(),
    }),
  ),
});

export type PublicPoll = z.infer<typeof publicPollSchema>;
