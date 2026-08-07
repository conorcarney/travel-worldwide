# Roadmap

## Phase 1 — Next.js scaffold

**Goal:** Initial Next.js app that compiles and has the basic shell.

- Scaffold Next.js (App Router) + TypeScript
- Basic **homepage**
- Basic **map page** (placeholder is fine)
- Confirm the project **compiles** (`next build` / local check)

**Exit criteria:** App builds cleanly; homepage and map page are reachable.

## Phase 2 — Leaflet, data routes, tests

**Goal:** Real map + API connectivity, verified by tests.

- Add **Leaflet** (`react-leaflet`) to the map page
- Wire **backend routes** to existing MongoDB resources (`Countries`, `Visited`, `Flights`, `BusesTrainsAndFerries`, `MapsMeBookmarks`, etc.)
- Confirm routes return usable data and the map can consume them
- Add **Playwright** tests for critical paths (page load, API/map smoke)

**Exit criteria:** Map renders with Leaflet; API routes work; Playwright suite passes for covered flows.

## Phase 3 — Map layers

**Goal:** Full layered map experience from the vision.

- Visited countries layer (green vs clear)
- Travel layer with mode colours (flight, ferry, bus, train, car)
- Bookmarks layer
- Layer toggles, zoom, hover/detail for routes and bookmarks
- Year slider to filter all dated map data (see vision)

**Exit criteria:** Layers can be toggled independently; year filter limits what’s shown; hover details work.

## Later

- Admin CRUD for routes
- Auth / roles for admin
- MAPS.ME bookmark refresh through July 2026
- Vercel + GitHub production deploy polish

## Working cadence

1. Do not start the next phase until the current exit criteria are met.
2. Prefer a compiling, tested vertical slice over unfinished breadth.
3. Keep `vision.md` / `architecture.md` aligned when behaviour changes.
