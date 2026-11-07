<p align="center">
  <img src="web/public/favicon.svg" alt="OpenSurvey logo" width="96" height="96" />
</p>

# OpenSurvey

[![CI](https://github.com/jonathan-lee-devel/opensurvey/actions/workflows/ci.yml/badge.svg)](https://github.com/jonathan-lee-devel/opensurvey/actions/workflows/ci.yml)

**An open-source, self-hosted feedback and survey tool. MIT licensed.**

OpenSurvey lets you build surveys, share a link, and read the results on infrastructure you run. Responses live in a database you control, the code is yours to read and change, and nothing phones home.

The stack is deliberately small: a [NestJS](https://nestjs.com) API and an [Angular](https://angular.dev) frontend, both written in TypeScript.

## Principles

- **Open source.** Everything needed to run OpenSurvey lives in this repository under the [MIT License](LICENSE). Read it, fork it, change it, redistribute it.
- **Self-hosted.** Deploy on a laptop, a VPS, or a container platform. Responses are stored where you deploy the API, and nothing is sent to a third party unless you configure it.
- **No lock-in.** Your data lives in your database. Export it, migrate it, or delete it without asking anyone for permission.
- **Simple stack.** One backend, one frontend, one language. Easy to read, easy to contribute to, easy to deploy.

## Repository layout

```
opensurvey/
├── api/                NestJS 12 backend (ESM, Vitest, oxlint)
├── web/                Angular 22 frontend (standalone components, signals, Vitest)
└── docker-compose.yml  PostgreSQL + Redis for development, or the whole stack
```

Each directory is an independent package with its own `package.json`, `yarn.lock`, and `node_modules`. There is no root workspace yet.

## Tech stack

| Layer    | Technology                                     |
| -------- | ---------------------------------------------- |
| Backend  | NestJS 12 on Node.js, Express adapter, ESM      |
| Data     | PostgreSQL via Drizzle ORM, Redis for rate limiting |
| Frontend | Angular 22, standalone components, signals, SCSS |
| Language | TypeScript 6                                   |
| Tests    | Vitest (both packages), Supertest for API e2e  |
| Tooling  | Yarn 1 (classic), Prettier, oxlint             |

## Prerequisites

- **Node.js 26** (the version CI runs on; 22 or newer should also work)
- **Yarn 1.22 (classic).** Both packages pin `yarn@1.22.22` and ship a v1 lockfile.
- **Docker.** The API needs PostgreSQL and Redis. The `infrastructure` profile in `docker-compose.yml` runs both for development, and the end-to-end tests start their own throwaway instances with [Testcontainers](https://testcontainers.com).

## Getting started

Clone the repository and install dependencies in both packages.

```bash
git clone https://github.com/jonathan-lee-devel/opensurvey.git
cd opensurvey

(cd api && yarn install)
(cd web && yarn install)
```

### Run the API

The API reads environment variables from `api/.env`. Start the development PostgreSQL and Redis from the repository root, copy the example configuration, then run the API.

```bash
docker compose --profile infrastructure up -d
cd api
cp .env.example .env
yarn start:dev
```

On startup the API connects to `DATABASE_URL` and applies any pending database migrations, so a fresh database is ready to use immediately. It also connects to `REDIS_URL`, where the rate limiter keeps its counters. The API listens on `http://localhost:3000` by default. Set `PORT` in `.env` to change it.

### Run the web app

```bash
cd web
yarn start
```

The Angular dev server runs at `http://localhost:4200` and reloads when files change.

### Run the whole stack with Docker

The `app` profile builds `api/Dockerfile` and `web/Dockerfile` (both on Node 26) and starts them with PostgreSQL and Redis.

```bash
docker compose --profile app up -d --build
```

The web app is served by nginx at `http://localhost:8080`, which also proxies `/api/` to the API container. The API itself is not published to the host, so its rate limiter can trust the single nginx hop for client addresses. Stop everything with `docker compose --profile app down`; add `-v` to drop the database volume as well.

## Configuration

All configuration for the API is read from `api/.env`.

| Variable             | Required | Description                                                                 |
| -------------------- | -------- | --------------------------------------------------------------------------- |
| `PORT`               | No       | Port the API listens on. Defaults to `3000`.                                |
| `DATABASE_URL`       | Yes      | PostgreSQL connection string. `.env.example` points at the compose database. |
| `REDIS_URL`          | Yes      | Redis connection string for rate-limit counters. `.env.example` points at the compose Redis. |
| `THROTTLE_LIMIT`     | No       | Requests allowed per client IP per window on every route. Defaults to `100`. |
| `THROTTLE_TTL_MS`    | No       | Length of the rate-limit window in milliseconds. Defaults to `60000`.       |
| `TRUST_PROXY`        | No       | Express `trust proxy` value (`1`, `loopback`, a CIDR list). Set it behind a reverse proxy so limits apply per client, not per proxy. |
| `OBSERVE_APP_KEY`    | No       | Key for [NestJS Observe](https://observe.nestjs.com) tracing and metrics.   |
| `OBSERVE_APP_SECRET` | No       | Secret paired with `OBSERVE_APP_KEY`.                                       |

Observe is optional. Without a key pair the module boots with placeholder credentials and the app runs normally. To enable it, run `npx @nestjs/observe link` inside `api/` and it will write the key pair into `.env`. The `.env` file is ignored by git.

## Scripts

### `api/`

| Command           | What it does                                   |
| ----------------- | ---------------------------------------------- |
| `yarn start:dev`  | Start in watch mode with `.env` loaded         |
| `yarn start`      | Start once with `.env` loaded                  |
| `yarn build`      | Compile to `dist/`                             |
| `yarn start:prod` | Run the compiled build from `dist/main`        |
| `yarn test`       | Run unit tests                                 |
| `yarn test:e2e`   | Run end-to-end tests against Testcontainers Postgres and Redis |
| `yarn test:cov`   | Run unit tests with coverage                   |
| `yarn lint`       | Lint `src/` and `test/` with oxlint            |
| `yarn format`     | Format source with Prettier                    |
| `yarn db:generate` | Generate a SQL migration from schema changes   |
| `yarn db:migrate` | Apply pending migrations without starting the API |
| `yarn db:studio`  | Browse the database with Drizzle Studio        |

### `web/`

| Command      | What it does                                    |
| ------------ | ----------------------------------------------- |
| `yarn start` | Serve the app at `http://localhost:4200`        |
| `yarn build` | Production build to `dist/`                     |
| `yarn watch` | Development build that rebuilds on change       |
| `yarn test`  | Run unit tests with Vitest                      |

## Database and migrations

The API uses [Drizzle ORM](https://orm.drizzle.team) with PostgreSQL. The schema lives in `api/src/database/schema/`, and the SQL migrations drizzle-kit generates from it live in `api/drizzle/`.

To change the schema:

1. Edit the table definitions in `api/src/database/schema/`.
2. Run `yarn db:generate` in `api/` to write a new migration to `api/drizzle/`.
3. Commit the schema change and the generated migration together.

The API applies pending migrations when it starts, so no separate step is needed in development. A deployment that starts several instances at once should instead run `yarn db:migrate` once as a release step, since each instance would otherwise try to migrate at the same time. The `api/drizzle/` directory must ship alongside `dist/` in any deployment artifact.

`yarn test:e2e` starts its own PostgreSQL and Redis containers with Testcontainers, applies the migrations, and removes them afterwards. It never touches the development services.

## Project status

OpenSurvey is in early development. The API boots against PostgreSQL and Redis with a database schema for users, surveys, and polls and global rate limiting, but exposes no routes yet, and the frontend ships a landing page. Survey authoring, response collection, and results views are the next pieces of work. Expect breaking changes until a first release is tagged.

## Contributing

Contributions are welcome. Every push to `main` and every pull request runs the [CI workflow](.github/workflows/ci.yml), which lints, tests, and builds both packages and builds their Docker images. Before opening a pull request:

1. Run the tests in the package you touched (`yarn test` in `api/` or `web/`).
2. Run `yarn lint` in `api/` if you changed backend code.
3. Format with Prettier (`yarn format` in `api/`; the `web/` package ships a `.prettierrc`).

Conventions for the frontend live in [`web/CLAUDE.md`](web/CLAUDE.md) and for the backend in [`api/AGENTS.md`](api/AGENTS.md). They apply to humans and coding agents alike.

## License

OpenSurvey is released under the [MIT License](LICENSE). Use it, change it, ship it, commercially or otherwise, with no obligation beyond keeping the copyright notice.
