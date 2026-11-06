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
├── api/   NestJS 12 backend (ESM, Vitest, oxlint)
└── web/   Angular 22 frontend (standalone components, signals, Vitest)
```

Each directory is an independent package with its own `package.json`, `yarn.lock`, and `node_modules`. There is no root workspace yet.

## Tech stack

| Layer    | Technology                                     |
| -------- | ---------------------------------------------- |
| Backend  | NestJS 12 on Node.js, Express adapter, ESM      |
| Frontend | Angular 22, standalone components, signals, SCSS |
| Language | TypeScript 6                                   |
| Tests    | Vitest (both packages), Supertest for API e2e  |
| Tooling  | Yarn 1 (classic), Prettier, oxlint             |

## Prerequisites

- **Node.js 26** (the version CI runs on; 22 or newer should also work)
- **Yarn 1.22 (classic).** Both packages pin `yarn@1.22.22` and ship a v1 lockfile.

## Getting started

Clone the repository and install dependencies in both packages.

```bash
git clone https://github.com/jonathan-lee-devel/opensurvey.git
cd opensurvey

(cd api && yarn install)
(cd web && yarn install)
```

### Run the API

The API reads environment variables from `api/.env`, so create that file first. It can be empty for local development.

```bash
cd api
touch .env
yarn start:dev
```

The API listens on `http://localhost:3000` by default. Set `PORT` in `.env` to change it.

### Run the web app

```bash
cd web
yarn start
```

The Angular dev server runs at `http://localhost:4200` and reloads when files change.

## Configuration

All configuration for the API is read from `api/.env`.

| Variable             | Required | Description                                                                 |
| -------------------- | -------- | --------------------------------------------------------------------------- |
| `PORT`               | No       | Port the API listens on. Defaults to `3000`.                                |
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
| `yarn test:e2e`   | Run end-to-end tests                           |
| `yarn test:cov`   | Run unit tests with coverage                   |
| `yarn lint`       | Lint `src/` and `test/` with oxlint            |
| `yarn format`     | Format source with Prettier                    |

### `web/`

| Command      | What it does                                    |
| ------------ | ----------------------------------------------- |
| `yarn start` | Serve the app at `http://localhost:4200`        |
| `yarn build` | Production build to `dist/`                     |
| `yarn watch` | Development build that rebuilds on change       |
| `yarn test`  | Run unit tests with Vitest                      |

## Project status

OpenSurvey is in early development. The API currently exposes a single health-style route and the frontend ships a landing page. Survey authoring, response collection, and results views are the next pieces of work. Expect breaking changes until a first release is tagged.

## Contributing

Contributions are welcome. Every push to `main` and every pull request runs the [CI workflow](.github/workflows/ci.yml), which lints, tests, and builds both packages. Before opening a pull request:

1. Run the tests in the package you touched (`yarn test` in `api/` or `web/`).
2. Run `yarn lint` in `api/` if you changed backend code.
3. Format with Prettier (`yarn format` in `api/`; the `web/` package ships a `.prettierrc`).

Conventions for the frontend live in [`web/CLAUDE.md`](web/CLAUDE.md) and for the backend in [`api/AGENTS.md`](api/AGENTS.md). They apply to humans and coding agents alike.

## License

OpenSurvey is released under the [MIT License](LICENSE). Use it, change it, ship it, commercially or otherwise, with no obligation beyond keeping the copyright notice.
