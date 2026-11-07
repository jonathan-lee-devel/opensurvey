import { z } from 'zod';

import { pageQuerySchema } from '../../../../common/paging.schema.js';
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

export const pollIdSchema = z.uuid().describe('The poll id');

/** Paging and an optional status filter for the poll list. */
export const listPollsQuerySchema = pageQuerySchema.extend({
  status: z
    .enum(publishStatus.enumValues)
    .optional()
    .describe('Only polls with this status'),
});

export type ListPollsQuery = z.infer<typeof listPollsQuerySchema>;

/** A poll in the list: everything but its options. */
export const adminPollSummarySchema = adminPollSchema.omit({ options: true });

export type AdminPollSummary = z.infer<typeof adminPollSummarySchema>;

export const adminPollListSchema = z.object({
  items: z.array(adminPollSummarySchema),
  /** Polls matching the filter in total, whatever the paging. */
  total: z.int().nonnegative(),
});

export type AdminPollList = z.infer<typeof adminPollListSchema>;
