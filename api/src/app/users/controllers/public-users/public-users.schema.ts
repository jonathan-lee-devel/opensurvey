import { z } from 'zod';

export const userIdSchema = z.uuid().describe('The user id');

/** The public face of a user: never the email address. */
export const publicUserSchema = z.object({
  id: z.uuid(),
  displayName: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export type PublicUser = z.infer<typeof publicUserSchema>;
