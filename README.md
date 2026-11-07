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
├── keycloak/           Realm the development Keycloak imports (users, roles, client)
└── docker-compose.yml  PostgreSQL + Redis + Keycloak for development, or the whole stack
```

Each directory is an independent package with its own `package.json`, `yarn.lock`, and `node_modules`. There is no root workspace yet.

## Tech stack

| Layer    | Technology                                     |
| -------- | ---------------------------------------------- |
| Backend  | NestJS 12 on Node.js, Express adapter, ESM      |
| Data     | PostgreSQL via Drizzle ORM, Redis for rate limiting and response caching |
| Auth     | JWT Bearer tokens from any OIDC provider, verified against its JWKS with jose |
| Frontend | Angular 22, standalone components, signals, SCSS |
| Language | TypeScript 6                                   |
| Tests    | Vitest (both packages), Supertest for API e2e  |
| Tooling  | Yarn 1 (classic), Prettier, oxlint             |

## Prerequisites

- **Node.js 26** (the version CI runs on; 22 or newer should also work)
- **Yarn 1.22 (classic).** Both packages pin `yarn@1.22.22` and ship a v1 lockfile.
- **Docker.** The API needs PostgreSQL, Redis and an OpenID Connect identity provider. The `infrastructure` profile in `docker-compose.yml` runs all three for development (the identity provider is [Keycloak](https://www.keycloak.org)), and the end-to-end tests start their own throwaway instances with [Testcontainers](https://testcontainers.com) and a local key server.

## Getting started

Clone the repository and install dependencies in both packages.

```bash
git clone https://github.com/jonathan-lee-devel/opensurvey.git
cd opensurvey

(cd api && yarn install)
(cd web && yarn install)
```

### Run the API

The API reads environment variables from `api/.env`. Start the development PostgreSQL, Redis and Keycloak from the repository root, copy the example configuration, then run the API.

```bash
docker compose --profile infrastructure up -d
cd api
cp .env.example .env
yarn start:dev
```

On startup the API connects to `DATABASE_URL` and applies any pending database migrations, so a fresh database is ready to use immediately. It also connects to `REDIS_URL`, where the rate limiter keeps its counters and the public `GET` routes cache their responses. Every route outside `/public/...` needs a JWT Bearer token from the identity provider named by `AUTH_JWKS_URL` and `AUTH_ISSUER`; the API issues no tokens itself. `.env.example` points at the development Keycloak, so tokens from it work out of the box; see [Local authentication](#local-authentication). The API listens on `http://localhost:3000` by default. Set `PORT` in `.env` to change it.

### Local authentication

Every route outside `/public/...` needs an `Authorization: Bearer <JWT>` header. The API never issues tokens; it verifies tokens from an OpenID Connect identity provider against that provider's published keys. For development the provider is the `keycloak` service in `docker-compose.yml`, which the `infrastructure` profile starts next to PostgreSQL and Redis.

**What runs.** Keycloak 26 in development mode (embedded database, plain http) on `http://localhost:8180`. On every start it imports [`keycloak/opensurvey-realm.json`](keycloak/opensurvey-realm.json), which defines the `opensurvey` realm:

| What                  | Value                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------- |
| Admin console         | `http://localhost:8180`, user `admin`, password `admin`                                |
| Client                | `opensurvey-web`, public, PKCE for the web app, password grant enabled for development |
| Role                  | `azg12345_SurveyAdmin`, the claim the API's `@HasClaim()` routes look for             |
| User with the role    | `admin@opensurvey.local`, password `admin`                                            |
| User without the role | `user@opensurvey.local`, password `user`                                              |

Access tokens carry `http://localhost:8180/realms/opensurvey` as `iss`, `opensurvey-api` in `aud`, and the user's realm roles in a flat `roles` claim. That is exactly what `api/.env.example` tells the API to expect, so nothing needs configuring. Tokens last an hour.

**Starting it.** `docker compose --profile infrastructure up -d` starts Keycloak with the other services. The first start pulls the image and takes 20 to 40 seconds to become ready; `docker compose --profile infrastructure up -d --wait` returns only once its health check passes. Check it yourself with `docker compose ps` (the `keycloak` service should read `healthy`) or by opening `http://localhost:8180/realms/opensurvey`, which returns the realm's metadata as JSON. The API does not need Keycloak at boot: it fetches the keys on the first protected request, so starting the API first is fine.

**Getting a token.** From a terminal, with [`jq`](https://jqlang.github.io/jq/) installed:

```bash
TOKEN=$(curl -s http://localhost:8180/realms/opensurvey/protocol/openid-connect/token \
  -d client_id=opensurvey-web -d grant_type=password \
  -d username=admin@opensurvey.local -d password=admin | jq -r .access_token)

curl http://localhost:3000/admin/users -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"email":"ada@example.com"}'
```

Use `user@opensurvey.local` / `user` for a signed-in caller without the admin role, which is how to see a `@HasClaim()` route answer 403. In Swagger UI (`http://localhost:3000/docs`) paste the token into **Authorize** and every admin request carries it. To inspect a token's claims, paste it into [jwt.io](https://jwt.io).

**Changing the setup.** The realm file is the only source of truth. There is no volume, so anything clicked into the admin console is gone at the next start, and that is deliberate: it keeps every developer's identity provider identical and makes the setup reviewable in a pull request. To add a user, role or client, edit `keycloak/opensurvey-realm.json` and recreate the container:

```bash
docker compose --profile infrastructure up -d --force-recreate keycloak
```

If you prefer to click first, make the change in the admin console, then in **Realm settings** open the **Action** menu (top right) and choose **Partial export** with clients and roles included. Copy the relevant parts of the download into the realm file: realm roles belong under `roles.realm`, clients under `clients`, and token claims come from the `protocolMappers` on the `opensurvey-web` client. A partial export never contains users, so write those under `users` by hand, following the two already there. Do not paste the whole export in: it is large and carries generated ids. (`kc.sh export` does not work against the running container, because development mode's embedded database is locked while Keycloak runs.)

**Using another identity provider.** Any OIDC provider works (Microsoft Entra ID, Auth0, Keycloak elsewhere, Amazon Cognito, Okta). Point `AUTH_JWKS_URL` at its JSON Web Key Set, set `AUTH_ISSUER` to the `iss` it writes into access tokens, and either set `AUTH_AUDIENCE` to the audience it issues for this API or leave it unset to skip that check. Tokens must be signed with an asymmetric algorithm (RS256, ES256 and friends; HMAC is refused) and carry `sub` and `exp`. For `@HasClaim('azg12345_SurveyAdmin')` to pass, the token needs that value as a key (`"azg12345_SurveyAdmin": true`) or as an entry of a `roles`, `groups`, `permissions` or space-separated `scope` claim. Most providers can map an app role or group into one of those.

**If something fails.** Every 401 from the API says why in its body and in the `WWW-Authenticate` header:

- `Missing Bearer token`: no `Authorization: Bearer` header reached the API. Check the header name and that nothing between the client and the API strips it.
- `Token claim "iss" is check_failed`: the token was issued for another issuer. With the compose Keycloak the token must come from `http://localhost:8180`, not `http://127.0.0.1:8180` or `http://keycloak:8080`; `KC_HOSTNAME` in `docker-compose.yml` pins the issuer to the first, and `AUTH_ISSUER` in `api/.env` must match it character for character, including no trailing slash.
- `Token claim "aud" is check_failed`: the token lacks `opensurvey-api` in `aud`. Tokens for the compose Keycloak get it from the audience mapper on the `opensurvey-web` client, so a token obtained through another client will not have it.
- `Token was not signed by a known key`: the API fetched the JWKS at `AUTH_JWKS_URL` and found no key with the token's `kid`. Usually `AUTH_JWKS_URL` points at a different realm or provider than the token came from, or Keycloak was recreated (which generates new keys) after the token was issued. Fetch a fresh token.
- `Token has expired`: tokens from the compose Keycloak last an hour. Fetch a new one.
- The API fails to start with a message about `AUTH_JWKS_URL` or `AUTH_ISSUER`: both are required. If your `api/.env` predates them, copy the `AUTH_*` lines from `api/.env.example`.
- Port `8180` is taken: change the host side of the `keycloak` service's `ports` mapping and `KC_HOSTNAME` together, then update `AUTH_JWKS_URL` and `AUTH_ISSUER` in `api/.env` to match.

The `app` profile runs the same Keycloak and configures the API container to use it, fetching the keys over the compose network while keeping the host-facing issuer. The end-to-end tests do not use it: `yarn test:e2e` starts its own throwaway key server and signs its own tokens.

### Run the web app

```bash
cd web
yarn start
```

The Angular dev server runs at `http://localhost:4200` and reloads when files change. It proxies `/api/*` to the API on port 3000 (`web/proxy.conf.json`), the same shape as the nginx in the web container, so the browser only ever talks to one origin.

The landing page links to the **admin console** at `http://localhost:4200/admin`, which signs in with the development Keycloak through OpenID Connect (authorization code flow with PKCE, client `opensurvey-web`). Use `admin@opensurvey.local` / `admin` for an account with the admin role, or `user@opensurvey.local` / `user` to see the console refuse an account without it. The console lists surveys, polls and users, shows a survey's submissions, creates all three, and publishes, closes, edits or deletes a survey against the `/admin/...` routes; it needs the API and the `infrastructure` profile running.

The identity provider, client id and admin role the console expects are build-time settings in `web/src/environments/environment.ts` (development) and `environment.production.ts` (production builds and the Docker image). Point those at your own provider when you deploy; the API side is `AUTH_JWKS_URL`, `AUTH_ISSUER` and `AUTH_AUDIENCE`.

### Run the whole stack with Docker

The `app` profile builds `api/Dockerfile` and `web/Dockerfile` (both on Node 26) and starts them with PostgreSQL, Redis and Keycloak.

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
| `REDIS_URL`          | Yes      | Redis connection string for rate-limit counters and the response cache. `.env.example` points at the compose Redis. |
| `THROTTLE_LIMIT`     | No       | Requests allowed per client IP per window on every route. Defaults to `100`. |
| `THROTTLE_TTL_MS`    | No       | Length of the rate-limit window in milliseconds. Defaults to `60000`.       |
| `CACHE_TTL_MS`       | No       | How long a `/public/...` response is served from Redis before the database is read again, in milliseconds. Defaults to `60000`. |
| `AUTH_JWKS_URL`      | Yes      | URL of your identity provider's JSON Web Key Set, used to verify the JWT Bearer tokens every non-public route requires. `.env.example` points at the compose Keycloak. |
| `AUTH_ISSUER`        | Yes      | The `iss` claim those tokens carry. `.env.example` points at the compose Keycloak's `opensurvey` realm. |
| `AUTH_AUDIENCE`      | No       | The `aud` claim those tokens must contain. Unset means the audience is not checked. The compose Keycloak issues `opensurvey-api`. |
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
