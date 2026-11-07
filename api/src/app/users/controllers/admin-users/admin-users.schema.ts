import { z } from 'zod';

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
