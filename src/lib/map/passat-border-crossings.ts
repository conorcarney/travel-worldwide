export type PassatBorderCrossingRow = {
  departureCountry: string;
  entryCountry: string;
  borderName: string;
  date: string;
  entryTime: string;
  totalCrossingTime: string;
  sortIndex: number;
};

const CROSSING_TIME = /^(\d{1,2}):([0-5]\d)$/;
const ENTRY_CLOCK = /^([01]?\d|2[0-3]):[0-5]\d$/;

export function isCrossingTime(value: string): boolean {
  return CROSSING_TIME.test(value.trim());
}

export function isEntryClock(value: string): boolean {
  return ENTRY_CLOCK.test(value.trim());
}

/** Minutes from `H:MM` / `HH:MM` for sorting. Invalid values sort last. */
export function crossingTimeMinutes(value: string): number {
  const match = value.trim().match(CROSSING_TIME);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function displayBorderField(value: string): string {
  return value.trim() ? value : "—";
}

export function normalizePassatBorderCrossings(
  data: unknown[],
): PassatBorderCrossingRow[] {
  const rows: PassatBorderCrossingRow[] = [];
  for (const [index, item] of data.entries()) {
    if (!item || typeof item !== "object") continue;
    const record = item as Partial<PassatBorderCrossingRow>;
    if (
      typeof record.departureCountry !== "string" ||
      !record.departureCountry.trim()
    ) {
      continue;
    }
    if (
      typeof record.entryCountry !== "string" ||
      !record.entryCountry.trim()
    ) {
      continue;
    }
    const totalCrossingTime =
      typeof record.totalCrossingTime === "string"
        ? record.totalCrossingTime.trim()
        : "";
    if (!isCrossingTime(totalCrossingTime)) continue;

    const sortIndex =
      typeof record.sortIndex === "number" && Number.isFinite(record.sortIndex)
        ? record.sortIndex
        : index;

    rows.push({
      departureCountry: record.departureCountry.trim(),
      entryCountry: record.entryCountry.trim(),
      borderName:
        typeof record.borderName === "string" ? record.borderName.trim() : "",
      date: typeof record.date === "string" ? record.date.trim() : "",
      entryTime:
        typeof record.entryTime === "string" ? record.entryTime.trim() : "",
      totalCrossingTime,
      sortIndex,
    });
  }

  return rows.sort((left, right) => left.sortIndex - right.sortIndex);
}
