# Vision

## Product

**AhBeGrand** is a personal travel map: a living record of where you’ve been, how you got there, and the places you’ve bookmarked along the way.

The app centers on an interactive world map. Visited countries stand out immediately; travel routes and bookmarks sit on toggleable layers so you can read the story of your travel at a glance or drill into a single journey.

## Who it is for

Primarily **you** — a single-owner travel log and map of personal history. An admin surface exists so routes can be maintained without editing code or raw data files.

## What the app entails

### World map — visited countries

- View a map of the world.
- Countries you’ve **visited** are highlighted in **green**.
- Countries you have **not** visited remain clear / unhighlighted.
- The map is **zoomable**.

### Time filter — year slider

- The map page includes a **year slider** that filters what is shown on the map.
- **All map data includes a date** (visited countries, routes, bookmarks, and any other plotted records).
- Moving the slider limits visible countries, routes, and bookmarks to those whose date falls in the selected year range (exact UX: single year vs range can be refined in implementation, but filtering by year is required).

### Travel layer — routes

A dedicated **travel layer** shows how you’ve moved between places, with each mode in its own colour:

| Mode   | Shown as        |
|--------|-----------------|
| Flight | Flight paths    |
| Ferry  | Ferry routes    |
| Bus    | Bus routes      |
| Train  | Train routes    |
| Car    | Car routes      |

Routes should be distinguishable at a glance and usable with the country highlighting still visible.

### Bookmarks layer

- The map shows **places you’ve bookmarked**.
- Bookmarks originate from **MAPS.ME**.
- Current backend bookmark data is current through **2023**.
- **Target:** refresh bookmark data through **July 2026**.
  - Prefer pulling from MAPS.ME directly if a reliable access path exists.
  - If MAPS.ME has no usable API/sync for bookmarks, fall back to importing an exported **KML/KMZ** (or equivalent) from the app so the catalog can still be brought up to date through July 2026.

### Interaction — hover details

- **Hover** (or equivalent focus on touch) on a **route** shows its details.
- **Hover** on a **bookmark** shows its details.
- Details should be enough to identify the place or journey without leaving the map.

### Admin — routes

- A **separate admin page** supports **add / update / delete** for routes (flights, ferries, buses, trains, cars).
- Country visit status and bookmark maintenance may grow later; MVP admin focus is **route CRUD**.

## Core promise

One zoomable world map that answers: **Where have I been? How did I get there? What places did I save?**—and **in which years?**

## Principles

1. **Map first** — The primary experience is the map, not a dashboard of cards or lists.
2. **Layers, not clutter** — Visited countries, travel modes, and bookmarks can be understood together or in isolation.
3. **Colour with meaning** — Green = visited; each transport mode has a stable, distinct colour.
4. **Personal truth** — Data reflects real trips and real bookmarks; accuracy beats decoration.
5. **Time-aware** — Every plotted record has a date; the year slider is a first-class way to read the history.
6. **Maintainable history** — Routes are editable via admin so the map stays current as travel continues.

## Success looks like

- At a glance, visited countries are obviously green and unvisited countries are not.
- Turning on the travel layer shows flight, ferry, bus, train, and car routes in separate colours.
- Bookmarks appear on the map and can be inspected on hover.
- Zoom and hover make individual routes and bookmarks readable.
- The year slider filters countries, routes, and bookmarks by date.
- New or corrected routes can be managed from the admin page without a deploy for content-only changes.
- Bookmark data covers MAPS.ME places through **July 2026** (via direct access if possible, otherwise import).

## Open constraints

- **MAPS.ME bookmarks:** There is no well-documented public API for live bookmark sync. Practical paths are account/export-based **KML/KMZ** (or device file) import into this app’s backend. Direct access should be attempted if credentials or an undocumented endpoint become available; otherwise import remains the supported update path.
