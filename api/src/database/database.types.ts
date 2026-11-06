import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type * as schema from './schema/index.js';

/**
 * The Drizzle database as registered by `DatabaseModule`, typed with the full
 * schema so `db.query.*` knows every table and relation.
 *
 * @example
 * constructor(@InjectDrizzle() private readonly db: Database) {}
 */
export type Database = NodePgDatabase<typeof schema>;

export { InjectDrizzle } from '@nestjs/drizzle';
