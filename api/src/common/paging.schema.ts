import { z } from 'zod';

/** Paging shared by the admin lists, which are all newest first. */
export const pageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PageQuery = z.infer<typeof pageQuerySchema>;
