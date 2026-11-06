import { INestApplication } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test, TestingModule } from '@nestjs/testing';
import { sql } from 'drizzle-orm';

import { AppModule } from './../src/app.module.js';
import { Database } from './../src/database/database.types.js';

// The database comes from the Testcontainers PostgreSQL that
// test/global-setup.ts starts, so these tests also cover the migrations the
// app applies on startup.
describe('AppModule (e2e)', () => {
  let app: INestApplication;
  let db: Database;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<Database>(getDrizzleToken());
  });

  it('applies the database migrations on startup', async () => {
    const result = await db.execute<{ count: number }>(
      sql`select count(*)::int as count from drizzle.__drizzle_migrations`,
    );
    expect(result.rows[0].count).toBeGreaterThanOrEqual(1);
  });

  it('creates the schema tables', async () => {
    await expect(db.query.users.findMany()).resolves.toEqual([]);
  });

  afterEach(async () => {
    await app.close();
  });
});
