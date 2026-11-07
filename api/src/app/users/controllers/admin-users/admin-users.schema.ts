import { z } from 'zod';

import { pageQuerySchema } from '../../../../common/paging.schema.js';

export const createUserSchema = z.strictObject({
  email: z.email().max(320),
  displayName: z.string().trim().min(1).max(120).optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;

/** A user as administrators see it, email included. */
export const adminUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type AdminUser = z.infer<typeof adminUserSchema>;

/** Paging for the user list: newest first. */
export const listUsersQuerySchema = pageQuerySchema;

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const adminUserListSchema = z.object({
  items: z.array(adminUserSchema),
  /** Users in total, whatever the paging. */
  total: z.int().nonnegative(),
});

export type AdminUserList = z.infer<typeof adminUserListSchema>;
