import { z } from 'zod';

import { slugSchema } from '../../../../common/slug.schema.js';
import { publishStatus } from '../../../../database/schema/index.js';

export const createPollSchema = z.strictObject({
  ownerId: z.uuid(),
  question: z.string().trim().min(1).max(500),
  slug: slugSchema,
  status: z.enum(publishStatus.enumValues).default('draft'),
  closesAt: z.iso.datetime({ offset: true }).nullable().default(null),
  options: z
    .array(z.string().trim().min(1).max(200))
    .min(2)
    .max(20)
    .describe('Option labels in display order'),
});

export type CreatePollDto = z.infer<typeof createPollSchema>;

/** A poll as administrators see it, owner included. */
export const adminPollSchema = z.object({
  id: z.uuid(),
  ownerId: z.uuid(),
  question: z.string(),
  slug: z.string(),
  status: z.enum(publishStatus.enumValues),
  closesAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  options: z.array(
    z.object({
      id: z.uuid(),
      label: z.string(),
      position: z.int().nonnegative(),
    }),
  ),
});

export type AdminPoll = z.infer<typeof adminPollSchema>;
