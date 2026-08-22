/** OpenFreeMap vector styles — https://openfreemap.org/quick_start/ */
export const OPENFREEMAP_STYLES = {
  liberty: "https://tiles.openfreemap.org/styles/liberty",
  bright: "https://tiles.openfreemap.org/styles/bright",
  positron: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
  fiord: "https://tiles.openfreemap.org/styles/fiord",
} as const;

/**
 * Default basemap style. Pitch/bearing must stay 0 when using maplibre-gl-leaflet
 * with Leaflet overlays (countries, routes) — the plugin only supports flat 2D sync.
 * OpenFreeMap "3D" (liberty + pitch) requires a pure MapLibre map instead.
 */
export const OPENFREEMAP_STYLE = OPENFREEMAP_STYLES.liberty;
