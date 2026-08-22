# Architecture

## Overview

**AhBeGrand** is a personal travel map built as a **Next.js** application (App Router) with TypeScript. The same Next.js app serves the React UI and the backend API. Existing travel data lives in **MongoDB**. The map is rendered with **Leaflet** and **react-leaflet**, using **OpenFreeMap** vector tiles via MapLibre GL.

```
┌──────────────────────────────────────────┐
│  Next.js (App Router + TypeScript)       │
│                                          │
│  ┌─────────────┐    ┌─────────────────┐  │
│  │ React UI    │───▶│ Route Handlers  │  │
│  │ (map, admin)│    │ /api/...        │  │
│  └─────────────┘    └────────┬────────┘  │
└──────────────────────────────┼───────────┘
                               ▼
                        ┌─────────────┐
                        │  MongoDB    │
                        │  (existing) │
                        └─────────────┘
```

## Stack

| Layer        | Choice                                      |
|--------------|---------------------------------------------|
| Framework    | Next.js (App Router)                        |
| Language     | TypeScript (strict)                         |
| UI           | React 19 + Server/Client Components         |
| Map          | Leaflet + `react-leaflet`                   |
| Data         | MongoDB (existing collections)              |
| API          | Next.js Route Handlers under `app/api`      |
| Validation   | Shared Zod (or equivalent) schemas          |
| Testing      | Playwright (E2E / UI)                       |
| Hosting      | Vercel                                      |
| CI/CD        | GitHub → Vercel (git integration)           |

## Application surfaces

| Surface            | Responsibility |
|--------------------|----------------|
| Map (primary)      | World map: visited countries (green), travel routes by mode, MAPS.ME bookmarks; zoom + hover details |
| Admin              | CRUD for routes (flights, buses/trains/ferries, car routes as modeled) |
| Auth / roles       | Gate admin and mutating APIs via `users` + `roles` |

## Backend data & API routes

Existing MongoDB-backed resources are exposed (and should continue to be named consistently) as:

| Resource                 | Role in the product |
|--------------------------|---------------------|
| `/Countries/`            | Country geometries / metadata for the choropleth map |
| `CountryList`            | Canonical list of countries |
| `Visited`                | Which countries have been visited (green highlight) |
| `Flights`                | Flight paths (travel layer) |
| `BusesTrainsAndFerries`  | Bus, train, and ferry routes (travel layer; split by mode in the UI) |
| `MapsMeBookmarks`        | Bookmark points from MAPS.ME |
| `Blogs`                  | Related written content (secondary to the map) |
| `users`                  | Accounts |
| `roles`                  | Authorization (e.g. admin vs read-only) |

Route handlers should mirror these resources under `app/api/...` (e.g. `app/api/flights/route.ts`, `app/api/visited/route.ts`) and talk to MongoDB through a shared client module—not ad-hoc connections per request file beyond a cached singleton.

## Frontend structure

```
app/
  (map)/page.tsx          # primary map experience
  admin/...               # route CRUD (protected)
  api/...                 # Route Handlers
components/
  map/                    # Leaflet map, layers, popups (Client Components)
  admin/                  # forms and tables
lib/
  mongodb.ts              # cached Mongo client
  validations/            # Zod schemas shared by API + forms
  types/                  # domain types inferred from schemas
```

### Map layers (client)

- **Visited countries** — GeoJSON/polygons styled green when in `Visited`
- **Travel** — polylines/paths coloured by mode (flight, ferry, bus, train, car)
- **Bookmarks** — markers from `MapsMeBookmarks`
- Layers are toggles; hover/focus shows route or bookmark details (Leaflet popup or tooltip)

Map UI must be a **Client Component** (`'use client'`) because Leaflet needs the browser. Prefer dynamic import with `ssr: false` for the map shell to avoid window/document issues during SSR.

## Next.js best practices

1. **App Router by default** — Use `app/` for pages and `app/api` for HTTP APIs. Prefer Server Components for layout, auth gates, and data that does not need the browser.
2. **Server vs Client Components** — Push `'use client'` to the leaves (map, interactive admin forms). Keep data fetching and secrets on the server.
3. **Route Handlers for mutations & private data** — Browser code never holds the MongoDB connection string. Admin writes go through `/api/...` with auth checks.
4. **Colocate by feature** — Map components, admin forms, and their hooks live near usage; shared domain types/schemas live in `lib/`.
5. **Environment** — `MONGODB_URI` and secrets only in server env (no `NEXT_PUBLIC_` for credentials).
6. **Caching** — Use Next fetch/cache or explicit revalidation for mostly-static country geometry; do not aggressively cache personalized or frequently edited route/bookmark payloads without a revalidate strategy.
7. **Error & loading UI** — `error.tsx` / `loading.tsx` for routes; API handlers return typed JSON errors with appropriate status codes.
8. **Middleware (optional)** — Protect `/admin` and mutating API paths early when session/role checks are shared.

## React best practices

1. **Composition over mega-components** — Separate `VisitedLayer`, `TravelLayer`, `BookmarksLayer`, and hover/detail UI.
2. **Controlled layer state** — Layer visibility and selected feature state live in React state (or URL search params when shareable); avoid hidden Leaflet-only state that React cannot read.
3. **Effects sparingly** — Use `useEffect` for Leaflet imperative sync only when props alone cannot express it; prefer declarative `react-leaflet` components.
4. **Modern React when appropriate** — Prefer `useEffectEvent` for event callbacks inside effects; `startTransition` for non-urgent UI updates (e.g. layer toggles on large datasets); `useDeferredValue` if search/filter input contends with heavy map updates. Follow React Compiler guidance in-repo: do not add `useMemo` / `useCallback` by default unless measuring a problem or matching existing patterns.
5. **Keys & lists** — Stable IDs from Mongo for routes and bookmarks when rendering layer children.
6. **Accessibility** — Keyboard-focusable controls for layer toggles; popups/details available without hover-only on touch (tap opens detail).

## TypeScript best practices

1. **`strict: true`** — Enable strict TypeScript in `tsconfig`; no implicit `any`.
2. **Single source of truth for shapes** — Define Zod schemas for API request/response and infer types (`z.infer<typeof FlightSchema>`). Avoid duplicate hand-written interfaces that drift from Mongo documents.
3. **Narrow API boundaries** — Route Handlers validate input with schemas before writing to MongoDB; return typed DTOs to the client (do not leak internal `_id` quirks or unused fields without intent).
4. **Prefer `unknown` + narrowing** over `any` when parsing JSON or Mongo documents.
5. **Typed Mongo access** — Collection helpers typed with domain document types; avoid untyped `Collection<any>`.
6. **No unsafe Leaflet escapes** — Wrap map libs behind typed props; isolate any necessary `as` assertions at the boundary.
7. **Shared types package path** — Use `@/lib/types` (or equivalent path alias) consistently; never import server-only modules into Client Components.

## AuthZ model

- Public (or authenticated read): map data — countries, visited, routes, bookmarks (as product requires).
- **Admin role** (from `roles` / `users`): create, update, delete routes via the admin UI and corresponding API routes.
- Every mutating handler checks role server-side; UI hiding is not sufficient.

## Cross-cutting concerns

- **Validation** — Shared schemas between admin forms and Route Handlers
- **Observability** — Structured logging on API failures; avoid logging secrets or full PII
- **Performance** — Country polygons cacheable; split travel modes client-side for colouring; consider simplifying geometry at world zoom
- **MAPS.ME refresh** — Import pipeline into `MapsMeBookmarks` (KML/KMZ or direct access if available); keep API shape stable for the map layer
- **Testing** — Playwright covers critical UI and map flows end-to-end

## Testing (Playwright)

Use **Playwright** for end-to-end and UI regression tests against the Next.js app.

| Area | What to cover |
|------|----------------|
| Map | Page loads; visited countries render; travel and bookmark layers toggle; hover/tap shows route or bookmark details; zoom interacts without crashing |
| Admin | Authenticated route CRUD (add / update / delete); unauthenticated users cannot reach mutating admin flows |
| API (via UI or `request`) | Happy-path reads for visited, flights, buses/trains/ferries, bookmarks; failed auth on mutations |

Practices:

1. Keep tests under `e2e/` (or `tests/e2e/`) with TypeScript.
2. Prefer role/label and stable `data-testid` selectors for map chrome (layer toggles, admin forms)—not brittle CSS from Leaflet internals where avoidable.
3. Use Playwright’s webServer config to boot `next dev` or `next start` locally; in CI, run against a built app.
4. Seed or mock Mongo where tests must not depend on production data; never point CI at production credentials.
5. Run Playwright in GitHub Actions on PRs; Vercel still handles deploy previews separately.
6. Screenshot/trace on failure for map visual regressions when useful; keep the suite lean—critical paths first.

## Deployment

Deployed on **Vercel**, connected to the **GitHub** repository.

```
GitHub (push / PR) ──▶ Vercel build (Next.js) ──▶ Production / Preview
                              │
                              └── env: MONGODB_URI, auth secrets, etc.
```

| Concern | Practice |
|---------|----------|
| Production | Deploys from the main branch (or the branch configured as Production in Vercel) |
| Previews | Every pull request gets a Preview Deployment for review |
| Env vars | Set in the Vercel project (`MONGODB_URI`, session/auth secrets). Never commit secrets. Use separate Preview vs Production values when the DB or auth must differ |
| MongoDB | External to Vercel (Atlas or existing host). Ensure the cluster allows connections from Vercel (network access / IP allowlist or private connectivity as configured) |
| Build | Standard Next.js on Vercel — no custom server. Prefer Platform features (env, previews) over bespoke CI unless checks need GitHub Actions |
| Runtime | Prefer serverless Route Handlers compatible with the Vercel Node runtime; avoid long-lived connections assumptions beyond a cached Mongo client pattern safe for serverless |

## Non-goals (v1)

- Separate backend service / microservice split
- Paid map SDKs (Google Maps, Mapbox) as the primary renderer
- Native mobile apps
- In-app booking
- Self-hosted Node servers outside Vercel for the web app

## Evolution

Stay on one Next.js deployable on Vercel + MongoDB until a clear boundary appears (e.g. heavy bookmark import jobs). Prefer improving typed schemas and layer performance before splitting services.
