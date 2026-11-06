import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Starts one PostgreSQL container (Testcontainers) for the whole run.
    globalSetup: ['./test/global-setup.ts'],
    // All files share that container, and Drizzle's migrator takes no lock, so
    // run them one at a time.
    fileParallelism: false,
    // The first Nest app in each file connects and runs migrations; allow for a
    // slow container on a cold machine.
    hookTimeout: 60_000,
  },
});
