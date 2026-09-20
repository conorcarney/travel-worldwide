export const YEAR_BAR_AXIS = "#9bb4bc";
export const YEAR_BAR_GRID = "#1e3d48";
export const YEAR_BAR_PAD = { top: 16, right: 8, bottom: 84, left: 36 };
export const YEAR_BAR_HEIGHT = 268;

export type YearBarLayout = {
  width: number;
  height: number;
  innerHeight: number;
  slot: number;
  barWidth: number;
};

export function yearBarLayout(yearCount: number): YearBarLayout {
  const innerWidth = Math.max(yearCount * 28, 560);
  const innerHeight = YEAR_BAR_HEIGHT - YEAR_BAR_PAD.top - YEAR_BAR_PAD.bottom;
  const slot = innerWidth / Math.max(yearCount, 1);
  return {
    width: YEAR_BAR_PAD.left + innerWidth + YEAR_BAR_PAD.right,
    height: YEAR_BAR_HEIGHT,
    innerHeight,
    slot,
    barWidth: Math.max(8, slot * 0.62),
  };
}
