import { ROUTE_COLORS } from "@/lib/map/normalize";
import type { TravelMode } from "@/lib/validations/map-data";

function svg(color: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">${body.replace(
    /COLOR/g,
    color,
  )}</svg>`;
}

const BODIES: Record<TravelMode, string> = {
  flight: [
    `<path fill="COLOR" stroke="#fff" stroke-width="1.1" stroke-linejoin="round" d="M16 2.2c.8 0 1.5 1.3 1.7 3.1l.4 8.2 11.1 3.4v2.1l-11.1-1.2.6 6.4 3.8 2.3v1.8l-5.3-1.3L16 29.6l-1.2-2.6-5.3 1.3v-1.8l3.8-2.3.6-6.4L3.8 16.9v-2.1l11.1-3.4.4-8.2C14.5 3.5 15.2 2.2 16 2.2Z"/>`,
    `<circle cx="16" cy="9.2" r="1" fill="#fff" opacity=".85"/>`,
  ].join(""),
  car: `<path fill="COLOR" stroke="#fff" stroke-width="1.2" stroke-linejoin="round" d="M11 6.5h10l3.2 5.2V23H21.5v2h-4v-2h-3v2h-4v-2H7.8V11.7Z"/><rect x="10.2" y="9.2" width="11.6" height="5.2" rx="1" fill="#fff" opacity=".35"/>`,
  bus: `<path fill="COLOR" stroke="#fff" stroke-width="1.2" stroke-linejoin="round" d="M10 4.5h12c1.2 0 2.2 1 2.2 2.2V24H21.5v2.2h-3.2V24h-4.6v2.2H10.5V24H7.8V6.7c0-1.2 1-2.2 2.2-2.2Z"/><rect x="10" y="7.5" width="12" height="8" rx="1" fill="#fff" opacity=".35"/>`,
  train: `<path fill="COLOR" stroke="#fff" stroke-width="1.2" stroke-linejoin="round" d="M11 3.8h10c1.5 0 2.7 1.2 2.7 2.7V23H21.2l1.3 3.2h-2.6L19 23h-6l-.9 3.2H9.5L10.8 23H8.3V6.5c0-1.5 1.2-2.7 2.7-2.7Z"/><rect x="11" y="7" width="10" height="7.5" rx="1" fill="#fff" opacity=".35"/>`,
  ferry: [
    `<path fill="COLOR" stroke="#fff" stroke-width="1.15" stroke-linejoin="round" d="M7.2 22.6 16 26.4 24.8 22.6 22.6 20.4H9.4Z"/>`,
    `<path fill="none" stroke="#fff" stroke-width="1.35" stroke-linecap="round" d="M16 20.6V4.4"/>`,
    `<path fill="#fff" stroke="#fff" stroke-width="0.8" stroke-linejoin="round" d="M16 5.2 16 19.4 26.2 17.6Z" opacity=".95"/>`,
    `<path fill="#fff" stroke="#fff" stroke-width="0.8" stroke-linejoin="round" d="M16 7.4 16 18.4 7.6 16.6Z" opacity=".75"/>`,
  ].join(""),
};

export function vehicleSvg(mode: TravelMode, color: string = ROUTE_COLORS[mode]): string {
  return svg(color, BODIES[mode]);
}

export function vehicleIconHtml(
  mode: TravelMode,
  bearing: number,
  color: string = ROUTE_COLORS[mode],
): string {
  return `<div class="travel-vehicle-icon-inner" data-testid="journey-vehicle" style="transform:rotate(${bearing}deg)">${vehicleSvg(mode, color)}</div>`;
}
