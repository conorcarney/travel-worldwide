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

type SeedTuple = [
  departureCountry: string,
  entryCountry: string,
  totalCrossingTime: string,
  date?: string,
];

const SEED_ROWS: SeedTuple[] = [
  ["Bulgaria", "Turkey", "1:39", "01/06/2025"],
  ["Turkey", "Georgia", "0:45", "03/06/2025"],
  ["Georgia", "Armenia", "0:55", "07/06/2025"],
  ["Armenia", "Georgia", "0:30", "10/06/2025"],
  ["Georgia", "Turkey", "0:13", "10/06/2025"],
  ["Turkey", "Iran", "3:45", "11/06/2025"],
  ["Iran", "Armenia", "2:20", "12/06/2025"],
  ["Armenia", "Georgia", "1:05", "14/06/2025"],
  ["Georgia", "Russia", "4:01", "26/10/2025"],
  ["Russia", "Kazakhstan", "1:30", "30/10/2025"],
  ["Kazakhstan", "Uzbekistan", "6:55"],
  ["Uzbekistan", "Kyrgyzstan", "1:56"],
  ["Kyrgyzstan", "Kazakhstan", "0:24"],
  ["Kazakhstan", "China", "5:30"],
  ["China", "Laos", "2:25"],
  ["Laos", "Thailand", "1:30"],
  ["Thailand", "Malaysia", "3:19"],
];

export const PASSAT_BORDER_CROSSING_SEED: PassatBorderCrossingRow[] =
  SEED_ROWS.map(([departureCountry, entryCountry, totalCrossingTime, date], index) => ({
    departureCountry,
    entryCountry,
    borderName: "",
    date: date ?? "",
    entryTime: "",
    totalCrossingTime,
    sortIndex: index,
  }));

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
