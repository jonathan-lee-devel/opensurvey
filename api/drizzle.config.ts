import { defineConfig } from 'drizzle-kit';

// Loaded by drizzle-kit through its own CommonJS loader, so keep paths
// relative to the working directory and avoid `import.meta` here.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  // Only `migrate`, `studio`, `push` and `pull` need credentials; `generate`
  // works without them. drizzle-kit reads .env from the working directory.
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
