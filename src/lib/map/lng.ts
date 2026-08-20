/** Signed longitude gap in (-180, 180], so interpolation takes the short way. */
export function shortestLngDelta(fromLng: number, toLng: number): number {
  let delta = toLng - fromLng;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}
