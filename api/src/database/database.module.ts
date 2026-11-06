import { join } from 'node:path';

import { Logger, Module } from '@nestjs/common';
import { DrizzleModule } from '@nestjs/drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import * as schema from './schema/index.js';

// This file sits two levels below the package root both in `src/` and in the
// compiled `dist/`, so the SQL migrations drizzle-kit writes to `./drizzle`
// resolve correctly whatever the working directory is.
const migrationsFolder = join(import.meta.dirname, '..', '..', 'drizzle');

/**
 * Connects to PostgreSQL and applies any pending migrations before the rest of
 * the application starts. The database is available everywhere through
 * `@InjectDrizzle()`, since `DrizzleModule` registers it globally.
 *
 * Several instances starting at once would each try to migrate. For such
 * deployments, run `yarn db:migrate` as a release step instead.
 */
@Module({
  imports: [
    DrizzleModule.forRootAsync({
      useFactory: async () => {
        const connection = process.env.DATABASE_URL;
        if (!connection) {
          throw new Error(
            'DATABASE_URL is not set. Copy .env.example to .env and point it at a PostgreSQL database.',
          );
        }
        const logger = new Logger(DatabaseModule.name);
        const db = drizzle({ connection, schema });
        await migrate(db, { migrationsFolder });
        logger.log('Database migrations applied');
        return { db };
      },
    }),
  ],
})
export class DatabaseModule {}
