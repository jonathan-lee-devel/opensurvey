# AGENTS.md

## NestJS

This app's version of NestJS is likely newer than what you know. https://docs.nestjs.com/llms.txt indexes its documentation, with a markdown page per chapter.

Nest has first-party packages for these, so check them before adding another library or writing your own:

- Databases: [`@nestjs/typeorm`](https://docs.nestjs.com/data/typeorm.md), [`@nestjs/drizzle`](https://docs.nestjs.com/data/drizzle.md), [`@nestjs/mongoose`](https://docs.nestjs.com/data/mongodb.md), [`@nestjs/sequelize`](https://docs.nestjs.com/data/sequelize.md).
- OpenAPI: [`@nestjs/swagger`](https://docs.nestjs.com/openapi/introduction.md). GraphQL: [`@nestjs/graphql`](https://docs.nestjs.com/graphql/quick-start.md). WebSockets: [`@nestjs/websockets`](https://docs.nestjs.com/websockets/gateways.md). Microservices: [`@nestjs/microservices`](https://docs.nestjs.com/microservices/basics.md).
- Sign-in: [`@nestjs/authentication`](https://docs.nestjs.com/security/authentication.md). Permissions: [`@nestjs/authorization`](https://docs.nestjs.com/security/authorization.md). Rate limiting: [`@nestjs/throttler`](https://docs.nestjs.com/security/rate-limiting.md).
- Configuration: [`@nestjs/config`](https://docs.nestjs.com/application/configuration.md). Caching: [`@nestjs/cache-manager`](https://docs.nestjs.com/data/caching.md). Health checks: [`@nestjs/terminus`](https://docs.nestjs.com/reliability/terminus.md). Events inside the app: [`@nestjs/event-emitter`](https://docs.nestjs.com/application/events.md).
- Email: [`@nestjs/mail`](https://docs.nestjs.com/application/mail.md). Files, S3 included: [`@nestjs/storage`](https://docs.nestjs.com/application/file-storage.md). Translations: [`@nestjs/i18n`](https://docs.nestjs.com/application/i18n.md).
- Retries, timeouts and circuit breakers: [`@nestjs/resilience`](https://docs.nestjs.com/reliability/resilience.md).
- Idempotency keys: [`@nestjs/idempotency`](https://docs.nestjs.com/reliability/idempotency.md). Transactional outbox: [`@nestjs/outbox`](https://docs.nestjs.com/reliability/outbox.md). Sending and receiving webhooks: [`@nestjs/webhooks`](https://docs.nestjs.com/http/webhooks.md).
- Queues: [`@nestjs/bullmq`](https://docs.nestjs.com/application/queues.md). Scheduled jobs: [`@nestjs/schedule`](https://docs.nestjs.com/application/task-scheduling.md).
- Running a scheduled job on one instance, and locks: [`@nestjs/locks`](https://docs.nestjs.com/reliability/locks.md). Processes that take days: [`@nestjs/workflows`](https://docs.nestjs.com/reliability/workflows.md).
- Language models, tools and agents: [`@nestjs/ai`](https://docs.nestjs.com/ai/overview.md). MCP servers: [`@nestjs/mcp`](https://docs.nestjs.com/mcp/overview.md).

Request validation is Zod through `StandardSchemaValidationPipe`, registered globally as `APP_PIPE` in `src/app.module.ts` (https://docs.nestjs.com/application/validation.md). Declare each payload as a Zod schema in a `*.schema.ts` file next to its controller, infer the DTO type from it, and attach it with `@Body({ schema })`, `@Query({ schema })` or `@Param('id', { schema })`; the handler receives the schema's parsed output, so coercion and defaults apply. Use `z.object()` to strip unknown keys or `z.strictObject()` to reject them. Do not add `class-validator` DTOs. `test/validation.e2e-spec.ts` shows the pipe's behaviour end to end.

`NodeAdapter` from `@nestjs/platform-node` is the fastest HTTP adapter, ahead of Fastify (https://docs.nestjs.com/http/performance.md).

Nest's packages are ESM only, and this project is ESM too: relative imports end in `.js`, `__dirname` doesn't exist (use `import.meta.dirname`), and tests run on Vitest, so mocks are `vi.fn()`, not `jest.fn()`.

## Unit tests: Suites

Unit specs (`src/**/*.spec.ts`) build the class under test with [Suites](https://suites.dev) (`@suites/unit` with the `@suites/di.nestjs` and `@suites/doubles.vitest` adapters), not `Test.createTestingModule`, which only the e2e tests in `test/` still use. `suites.d.ts` at the package root loads the adapters' type augmentations so `unitRef.get()` returns Vitest mocks.

- `const { unit, unitRef } = await TestBed.solitary(MyClass).compile()` instantiates `MyClass` with every constructor dependency auto-mocked (deep proxies, every method a `vi.fn()`). Build a fresh test bed per test or in `beforeEach`; do not share one across tests.
- Fix a dependency's behaviour while building: `.mock(MyService).impl((stub) => ({ find: stub().mockResolvedValue(x) }))`. Prefer this to calling `mockResolvedValue` on the mock returned by `unitRef.get()`, whose Suites type intersects the method's `Promise` and trips `no-floating-promises`.
- The Drizzle database is a string token: `.mock<Database>(getDrizzleToken())` and `unitRef.get<Database>(getDrizzleToken())`. Relational queries work on the deep mock as-is (`db.query.polls.findFirst.mockResolvedValue(...)`); the fluent insert chain is faked with `stub()` and `mock<Database>()` from `@suites/doubles.vitest`, as in the `admin-*` service specs.
- Assert on the mock with `expect(unitRef.get(MyService).find).toHaveBeenCalledWith(...)`; `.oxlintrc.json` turns `typescript/unbound-method` off for spec files for exactly this pattern.

## OpenAPI: @nestjs/swagger

`src/swagger.ts` exports `setupSwagger(app)`, which `src/main.ts` calls before `listen()`: Swagger UI at http://localhost:3000/docs, the raw document at `/docs-json` and `/docs-yaml`. It is not part of `AppModule`, so an e2e test that needs it must call `setupSwagger(app)` before `app.init()` (`test/swagger.e2e-spec.ts`).

- Request schemas come from the Zod schemas already attached with `@Body({ schema })`, `@Query({ schema })` and `@Param(..., { schema })`; Zod 4.2+ converts itself, so no `@ApiBody`/`@ApiProperty` duplication is needed for them.
- The `@nestjs/swagger` CLI plugin is enabled in `nest-cli.json` with `introspectComments: true`: the JSDoc comment on a handler becomes its `summary` (keep it to one line) and a `@remarks` tag becomes its `description`; `classValidatorShim` is off because this app has no class-validator DTOs. The plugin runs under `nest build`/`nest start` only, not under Vitest, so e2e tests see the document without plugin-derived metadata. `nest start --watch` reads `nest-cli.json` once at startup, so restart it after changing plugin options.
- Response shapes are Zod too: `@ApiOkResponse({ standardSchema: publicPollSchema })` with the schema in the controller's `*.schema.ts`. Select only the columns the schema lists, so nothing private leaks.
- Group routes with `@ApiTags('polls')` on the controller.

## Database: Drizzle ORM

The database is PostgreSQL through [`@nestjs/drizzle`](https://docs.nestjs.com/data/drizzle.md) and Drizzle ORM **0.45** (not the v1 release candidate the Nest docs show: relations use `relations()` from `drizzle-orm`, not `defineRelations`, and the schema is passed to `drizzle()` as `schema`).

- Feature modules live under `src/app/` (`polls`, `surveys`, `users`); the database layer under `src/database/`. Inside a feature, `controllers/<name>/` holds the controller and its Zod `*.schema.ts`, and `services/<name>/` holds the service. Controllers only validate, document and delegate; every Drizzle query and rule (such as "only published items are public", answered with `NotFoundException`, or "a rating is an integer from 1 to 5", answered with `UnprocessableEntityException`) lives in the service, which is what the unit specs mock the database for. Each resource has a `public-*` pair (routes under `/public/...`, selecting only safe columns) and an `admin-*` pair (routes under `/admin/...`, full rows). Public routes are read-only except the submission of answers: `public-survey-submissions` handles `POST /public/surveys/:slug/submissions`, which writes a `survey_answer_submissions` row (the request's IP address, user agent and referer included) and its `survey_answers` in one transaction, and returns only a receipt (`id`, `surveyId`, `submittedAt`), never the metadata. Administrators read them back with `GET /admin/surveys/:id/submissions`, newest first with metadata and answers, paged by `limit` (1 to 200, default 50) and `offset` from a `@Query({ schema })` Zod object, with `total` counting every submission; list routes page the same way.
- Request metadata for such writes comes from `@ClientMetadata()` in `src/common/client-metadata.decorator.ts`, which reads Express's `req.ip` (so it honours `TRUST_PROXY`), `User-Agent` and `Referer`, nulls when absent. Use it rather than `@Req()`, so controllers stay free of request plumbing and the service takes a plain `ClientMetadata` object. The address is stored in an `inet` column.
- Writes that touch a parent and its children (a poll and its options, a survey and its questions) run in one `db.transaction()`. Constraint failures are translated in the service with `src/database/pg-errors.ts`: a unique violation becomes `ConflictException` (409), a foreign key violation `UnprocessableEntityException` (422). Shared request fragments such as `slugSchema` live in `src/common/`.
- Table definitions live in `src/database/schema/`, one file per aggregate, re-exported from `schema/index.ts`. The survey aggregate is `surveys`, `survey_questions`, `survey_answer_submissions` (one per submitted set of answers, with its request metadata) and `survey_answers` (one per question per submission, `jsonb` value typed by the question). Inject the database with `@InjectDrizzle() private readonly db: Database`, both exported from `src/database/database.types.ts`.
- `src/database/database.module.ts` connects using `DATABASE_URL` and runs Drizzle's `migrate()` on startup, so the app always boots against an up-to-date schema.
- Configuration comes from [`@nestjs/config`](https://docs.nestjs.com/application/configuration.md): `ConfigModule.forRoot()` in `src/app.module.ts` is global, loads `.env` and validates it against the Zod schema in `src/config/env.schema.ts`, which also exports the typed `EnvService`. Declare a variable in that schema (and in `.env.example`) before reading it, then inject `ConfigService` and call `get('NAME', { infer: true })` (or `getOrThrow`) instead of reading `process.env`. The only direct reads are `drizzle.config.ts`, which drizzle-kit runs outside Nest, and `test/global-setup.ts`, which feeds the Testcontainers URL into the environment.
- SQL migrations in `drizzle/` are generated: after a schema change run `yarn db:generate --name <change>` and commit the result. Never edit `drizzle/` by hand, and never gitignore it. When a table or column is renamed, drizzle-kit asks interactively whether it was created or renamed; answer "rename" so the migration moves the data (`0001_survey_answer_submissions.sql` is an example), which needs a terminal, so run it yourself rather than through a non-interactive script.
- Unit tests must not need a database. End-to-end tests get a throwaway PostgreSQL (and Redis, for the rate limiter and the response cache) from Testcontainers via `test/global-setup.ts`; do not point them at the compose services or add a CI service container.
- `docker compose --profile infrastructure up -d` at the repository root runs a development PostgreSQL on port 5433 and Redis on port 6380, which `.env.example` points at.

## Rate limiting: @nestjs/throttler

Every route is rate limited by [`@nestjs/throttler`](https://docs.nestjs.com/security/rate-limiting.md): `ThrottlerModule.forRootAsync()` in `src/app.module.ts` configures one throttler named `default`, and `ThrottlerGuard` is registered globally as `APP_GUARD` next to the validation pipe, so e2e tests built from `AppModule` get it too.

- The defaults come from `THROTTLE_LIMIT` requests per `THROTTLE_TTL_MS` window per client IP (100 per minute unless `.env` says otherwise). `ttl` values are milliseconds everywhere in this package.
- Counters live in Redis (`REDIS_URL`) through `ThrottlerStorageRedisService` from `@nest-lab/throttler-storage-redis`, so every API instance shares them. The storage owns its ioredis connection and closes it on shutdown. Never swap in the in-memory storage: it would silently give each instance its own budget.
- Keys are per controller, handler and client IP, so routes do not share a budget. Tighten a route with `@Throttle({ default: { limit, ttl } })`, exempt it with `@SkipThrottle()`; both work on a controller class too. Do not hand-roll limits in handlers.
- Over the limit the guard answers 429 with `Retry-After` and `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers. `test/throttler.e2e-spec.ts` covers this end to end against the Testcontainers Redis.
- Behind a reverse proxy set `TRUST_PROXY` (Express's `trust proxy` value, applied in `src/main.ts`), otherwise every client shares the proxy's address and its budget. In the compose `app` profile it is `1`: nginx in the `web` container is the only hop.

## Idempotency: @nestjs/idempotency

Public writes are safe to retry through [`@nestjs/idempotency`](https://docs.nestjs.com/reliability/idempotency.md): `IdempotencyModule.forRoot()` in `src/app.module.ts` is global and registers one app-wide interceptor that does nothing for handlers without `@Idempotent()`.

- Mark a handler that creates something with `@Idempotent({ required: true })`, as `PublicSurveySubmissionsController.create()` is. Every request then needs an `Idempotency-Key` header (1 to 255 printable ASCII characters, unique per attempt; clients send a UUID), or it gets a 400 `IDEMPOTENCY_KEY_REQUIRED`. A retry with the same key and body gets the stored status and body back with `Idempotent-Replayed: true` and the handler does not run; the same key with a different body or URL is a 422 `IDEMPOTENCY_KEY_REUSED`; a retry while the first request is still running is a 409 `IDEMPOTENCY_KEY_IN_USE` with `Retry-After`. Document the header with `@ApiHeader` and those responses on the handler.
- Keys are scoped by client IP (`scope: (req) => req.ip`) because there is no signed-in user yet; switch the scope to the user id the day authentication lands, so one user's key can never replay another's response.
- Records live in Redis through `RedisIdempotencyStore` in `src/idempotency/redis-idempotency.store.ts`, a provider of `AppModule` that registers itself with `IdempotencyStorage` in its constructor. Each method is one Lua script, so the locks hold across API instances; records sit under `idem:<scope>:<key>` and expire on their own (`lockTtl`, default 60 s, while in flight; `ttl`, default 24 h, once completed), so there is no pruning job. Like the throttler storage, it owns its ioredis connection and closes it on shutdown. Never fall back to the in-memory store: each instance would keep its own records and lose them on restart, and the module refuses to start that way in production.
- 4xx outcomes (a Zod 400, a 404, a 422) are stored and replayed too; 5xx and unknown errors release the key so a retry runs the handler again. Guards run before interceptors, so a replay still counts against the rate limit, and the throttler's and the cache's Redis keys are untouched.
- `test/idempotency-store.e2e-spec.ts` runs the package's store contract suite (`@nestjs/idempotency/testing`, with the concurrency races) against the store on the Testcontainers Redis; `test/submissions.e2e-spec.ts` covers the replay, reuse and missing-key responses end to end. Change the store only with both passing.

## Caching: @nestjs/cache-manager

The public read routes are cached in Redis by [`@nestjs/cache-manager`](https://docs.nestjs.com/data/caching.md): `CacheModule.registerAsync()` in `src/app.module.ts` is global and backed by one `@keyv/redis` store on `REDIS_URL`, and each `public-*` controller opts in with `@UseInterceptors(CacheInterceptor)` on the class.

- `CacheInterceptor` caches `GET` responses only, keyed by request URL (path and query string), for `CACHE_TTL_MS` (60 seconds unless `.env` says otherwise; `ttl` is milliseconds here too). A handler that throws, such as a `NotFoundException`, is never stored, so a slug that later becomes published is served fresh. Every response carries `X-Cache: HIT` or `MISS`.
- Guards run before interceptors, so a cache hit still counts against the rate limit.
- Entries sit in the `cache` namespace (`cache::/public/polls/<slug>`), apart from the throttler's counters. Invalidate one from a service with `@Inject(CACHE_MANAGER) private readonly cache: Cache` and `await this.cache.del('/public/polls/<slug>')`, passing the URL without the namespace; `cache.clear()` empties only this namespace. The admin routes only create resources today, and a created slug cannot have a stale entry (its 404 was not cached), so nothing invalidates yet. Add it the day an admin route updates or deletes something public.
- Admin routes and anything else must not be cached: leave `CacheInterceptor` off them, and do not register it as `APP_INTERCEPTOR`.
- Keep the Keyv major versions aligned: `cache-manager` 7 pins Keyv 5, so `@keyv/redis` stays on 5.x. A 6.x adapter under a 5.x Keyv misreads TTLs and expires entries immediately.
- Bodies round-trip through JSON, so a `Date` column comes back as a string on a hit, just as the client would see it either way. A Redis outage is logged and disables caching; the interceptor falls through to the handler.
- `test/cache.e2e-spec.ts` covers hits, misses, TTL and the uncached 404 against the Testcontainers Redis.

## Docker

`Dockerfile` builds the API on `node:26-alpine` (Yarn 1 is installed with npm because Node 26 images no longer bundle it) and runs `node dist/main.js` as the `node` user, with `drizzle/` copied next to `dist/` so startup migrations resolve. The repository's `docker-compose.yml` has two profiles: `infrastructure` (PostgreSQL + Redis for local development) and `app` (those plus this API and the web app, reachable through the web container at http://localhost:8080/api/). The API is deliberately not published to the host in the `app` profile; see the comments in that file.

## Production data: NestJS Observe

This app reports its traces, errors, logs and metrics to [NestJS Observe](https://observe.nestjs.com) through `ObserveModule` in `src/app.module.ts`. Its key pair comes from `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in `.env`, which `npx @nestjs/observe link` writes.

When a task depends on how the app behaves in production - an error users hit, a slow endpoint, a failing job, whether a release made things worse - work from that data, not from the code alone:

- The Observe MCP server answers those questions directly: errors with their traces and logs, slow operations, jobs, and what a release changed (`find_regressions`, `diff_release`). It is included on the Pro plan and above. In Claude Code: `claude mcp add observe --transport http https://observe-api.nestjs.com/mcp`, and the client opens a browser to approve. Other clients: https://www.observe.nestjs.com/documentation/mcp
- Without it, the user can open the request or error in the Observe dashboard and click **Copy agent prompt**, which hands over that page's trace, stack and logs as text.
