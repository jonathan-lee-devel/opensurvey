import type { ConfigService } from '@nestjs/config';
import { z } from 'zod';

/**
 * Every environment variable the API reads. `ConfigModule.forRoot()` validates
 * the merged `.env` + process environment against this schema at startup and
 * serves the parsed values, so `PORT` is a number by the time code reads it,
 * and a missing or malformed variable stops the boot with a message per field.
 *
 * Add a variable here before reading it through `ConfigService`, and mirror it
 * in `.env.example`.
 */
export const envSchema = z.object({
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error:
      'must be a postgres:// connection string. Copy .env.example to .env and point it at a PostgreSQL database.',
  }),
  // Optional: without a key pair Observe warns at startup and sends nothing.
  OBSERVE_APP_KEY: z.string().optional(),
  OBSERVE_APP_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** `ConfigService` typed against the schema: `get('PORT', { infer: true })` is a `number`. */
export type EnvService = ConfigService<Env, true>;
