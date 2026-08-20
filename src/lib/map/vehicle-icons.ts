import { ROUTE_COLORS } from "@/lib/map/normalize";
import { vehicleFollowTransform } from "@/lib/map/journey";
import type { TravelMode } from "@/lib/validations/map-data";

function hexChannels(hex: string): [number, number, number] | null {
  const raw = hex.replace("#", "");
  const normalized =
    raw.length === 3
      ? raw
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : raw;
  if (normalized.length !== 6) return null;
  const value = Number.parseInt(normalized, 16);
  if (!Number.isFinite(value)) return null;
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function channelToHex(channel: number): string {
  return Math.max(0, Math.min(255, Math.round(channel)))
    .toString(16)
    .padStart(2, "0");
}

function darken(hex: string, factor: number): string {
  const channels = hexChannels(hex);
  if (!channels) return hex;
  return `#${channels.map((channel) => channelToHex(channel * factor)).join("")}`;
}

function mixWhite(hex: string, amount: number): string {
  const channels = hexChannels(hex);
  if (!channels) return hex;
  return `#${channels
    .map((channel) => channelToHex(channel + (255 - channel) * amount))
    .join("")}`;
}

function faces(...classNames: string[]): string {
  return classNames
    .map((className) => `<div class="v3d-face ${className}"></div>`)
    .join("");
}

function wheels(...slots: string[]): string {
  return slots
    .map(
      (slot) =>
        `<div class="v3d-wheel v3d-wheel--${slot}"><div class="v3d-wheel-spin"></div></div>`,
    )
    .join("");
}

const MODELS: Record<TravelMode, string> = {
  car: [
    `<div class="v3d-shadow"></div>`,
    `<div class="v3d-rig">`,
    `<div class="v3d-box v3d-car-body">${faces(
      "v3d-car-body-top",
      "v3d-car-body-bottom",
      "v3d-car-body-front",
      "v3d-car-body-back",
      "v3d-car-body-left",
      "v3d-car-body-right",
    )}</div>`,
    `<div class="v3d-box v3d-car-cabin">${faces(
      "v3d-car-cabin-top",
      "v3d-car-cabin-front",
      "v3d-car-cabin-back",
      "v3d-car-cabin-left",
      "v3d-car-cabin-right",
    )}</div>`,
    wheels("fl", "fr", "rl", "rr"),
    `</div>`,
  ].join(""),
  bus: [
    `<div class="v3d-shadow"></div>`,
    `<div class="v3d-rig">`,
    `<div class="v3d-box v3d-bus-body">${faces(
      "v3d-bus-top",
      "v3d-bus-bottom",
      "v3d-bus-front",
      "v3d-bus-back",
      "v3d-bus-left",
      "v3d-bus-right",
    )}</div>`,
    wheels("fl", "fr", "ml", "mr", "rl", "rr"),
    `</div>`,
  ].join(""),
  train: [
    `<div class="v3d-shadow"></div>`,
    `<div class="v3d-rig">`,
    `<div class="v3d-box v3d-train-body">${faces(
      "v3d-train-top",
      "v3d-train-bottom",
      "v3d-train-front",
      "v3d-train-back",
      "v3d-train-left",
      "v3d-train-right",
    )}</div>`,
    wheels("fl", "fr", "rl", "rr"),
    `</div>`,
  ].join(""),
  ferry: [
    `<div class="v3d-shadow v3d-shadow--wake"></div>`,
    `<div class="v3d-rig">`,
    `<div class="v3d-box v3d-ferry-hull">${faces(
      "v3d-ferry-hull-top",
      "v3d-ferry-hull-bottom",
      "v3d-ferry-hull-front",
      "v3d-ferry-hull-back",
      "v3d-ferry-hull-left",
      "v3d-ferry-hull-right",
    )}</div>`,
    `<div class="v3d-box v3d-ferry-cabin">${faces(
      "v3d-ferry-cabin-top",
      "v3d-ferry-cabin-front",
      "v3d-ferry-cabin-back",
      "v3d-ferry-cabin-left",
      "v3d-ferry-cabin-right",
    )}</div>`,
    `<div class="v3d-box v3d-ferry-funnel">${faces(
      "v3d-ferry-funnel-top",
      "v3d-ferry-funnel-front",
      "v3d-ferry-funnel-back",
      "v3d-ferry-funnel-left",
      "v3d-ferry-funnel-right",
    )}</div>`,
    `</div>`,
  ].join(""),
  flight: [
    `<div class="v3d-shadow"></div>`,
    `<div class="v3d-rig">`,
    `<div class="v3d-box v3d-plane-fuse">${faces(
      "v3d-plane-fuse-top",
      "v3d-plane-fuse-bottom",
      "v3d-plane-fuse-front",
      "v3d-plane-fuse-back",
      "v3d-plane-fuse-left",
      "v3d-plane-fuse-right",
    )}</div>`,
    `<div class="v3d-box v3d-plane-wing">${faces(
      "v3d-plane-wing-top",
      "v3d-plane-wing-bottom",
    )}</div>`,
    `<div class="v3d-box v3d-plane-tail">${faces(
      "v3d-plane-tail-left",
      "v3d-plane-tail-right",
    )}</div>`,
    `<div class="v3d-box v3d-plane-stab">${faces(
      "v3d-plane-stab-top",
      "v3d-plane-stab-bottom",
    )}</div>`,
    `<div class="v3d-engine v3d-engine--l"><div class="v3d-fan"></div></div>`,
    `<div class="v3d-engine v3d-engine--r"><div class="v3d-fan"></div></div>`,
    `</div>`,
  ].join(""),
};

export function vehicleModelHtml(
  mode: TravelMode,
  color: string = ROUTE_COLORS[mode],
): string {
  return `<div class="v3d v3d--${mode}" style="--v3d-body:${color};--v3d-lite:${mixWhite(color, 0.28)};--v3d-shade:${darken(color, 0.72)};--v3d-deep:${darken(color, 0.48)}">${MODELS[mode]}</div>`;
}

export function vehicleIconHtml(
  mode: TravelMode,
  bearing: number,
  color: string = ROUTE_COLORS[mode],
  pitch = 0,
): string {
  return `<div class="travel-vehicle-icon-inner" data-testid="journey-vehicle" style="transform:${vehicleFollowTransform(bearing, pitch)}">${vehicleModelHtml(mode, color)}</div>`;
}
