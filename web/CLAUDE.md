You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

## Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()` with `output()`
- Use `computed()` for derived state
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Prefer inline templates for small components
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- Do NOT import `CommonModule`, import only the directives and pipes the template uses, such as `AsyncPipe` or `DatePipe`
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection

## Admin console architecture

The console lives under `src/app/` in four layers. Keep new work in the layer it belongs to:

- `core/api/`: one `@Service()` per API controller (`AdminSurveysService` for `/admin/surveys`, ...), each method a thin `HttpClient` call returning an `Observable` of the type in `core/api/models.ts`. Those types mirror the API's Zod output types in `api/src/app/<feature>/controllers/admin-<name>/admin-<name>.schema.ts`, same names and fields; update both sides together. URLs start with `environment.apiBaseUrl` (`/api`, proxied to the API by `proxy.conf.json` under `ng serve` and by `nginx.conf` in Docker). No state and no error handling in services: `apiErrorInterceptor` turns every failure into an `ApiError` (`core/api/api-error.ts`) with `fieldErrors` from the API's `"<path>: <issue>"` validation messages, and sends the user back to sign in on a 401.
- `core/stores/`: `@ngrx/signals` stores own all shared state. Root stores (`SurveysStore`, `UsersStore`, `PollsStore`, `ToastsStore`, `AuthStore`) are `signalStore({ providedIn: 'root' }, ...)`; a store scoped to one page (`SurveyDetailStore`) is listed in that route's `providers`. Lists use `withEntities()`, loading uses `rxMethod` + `tapResponse`, and `withRequestStatus()` (`core/stores/with-request-status.ts`) gives every store `isPending`/`error` with the `setPending()`/`setFulfilled()`/`setError()` updaters. A reactive loader takes a signal (`store.load(store.query)`) so filter and page changes refetch on their own. Writes are `async` methods returning the created item and rejecting with the `ApiError`, so a form can place field errors; they toast through `ToastsStore`. Components read store signals and call store methods; they never inject an API service.
- `core/auth/`: `AuthStore` wraps `angular-oauth2-oidc` (authorization code flow with PKCE, configured from `src/environments/`). `adminGuard` protects `/admin` and requires the claim in `environment.adminClaim`, checked by `hasClaim()` in `core/auth/claims.ts`, a port of the API's `api/src/auth/claims.ts`; keep the two in step. `authInterceptor` adds the Bearer token to `/api/...` calls except `/api/public/...`.
- `common/`: presentational building blocks (`app-page-header`, `app-status-badge`, `app-pager`, `app-empty-state`, `app-loading-indicator`, `app-error-banner`, `app-form-field`, `app-copy-button`, the label pipes) with `input()`/`output()` and no store injection; `app-toast-host` is the one exception because it renders `ToastsStore`. Shared classes (`.btn`, `.input`, `.table`, `.panel`, ...) are in `src/styles.scss`.
- `pages/`: lazy-loaded routes. `pages/admin/admin.routes.ts` lists the console's pages inside `AdminShell`.

Forms are Signal Forms: a `signal<Model>` plus `form(model, schema)` whose validators mirror the API's Zod schema (lengths, patterns, option counts) so the API rarely rejects. Bind controls with `[formField]`; wrap each in `<app-form-field [field] label controlId>` for the label, hint and errors; do not set `maxlength` on a `[formField]` control (the directive owns it). Submit with `submit(form, action)`, and on failure return `toSubmitErrors(error, { fieldFor, byStatus })` from `core/forms/form-utils.ts` so API errors land on their fields (a 409 on the slug, a 422 on the owner) or on the form root.

Configuration is build-time: `src/environments/environment.ts` (development) and `environment.production.ts` (swapped in by `fileReplacements`); the shape is `environment.types.ts`. Add a setting there rather than reading `window` or hard-coding a URL.
