"use client";

import {
  formatPassatEur,
  formatPassatNumber,
  PASSAT_BREAKDOWN_ROWS,
  PASSAT_BREAKDOWN_TOTAL_EUR,
  PASSAT_COUNTRY_ROWS,
  PASSAT_COUNTRY_TOTALS,
  type PassatBreakdownRow,
  type PassatCountryRow,
} from "@/lib/map/passat-road-trip";
import {
  crossingTimeMinutes,
  displayBorderField,
  type PassatBorderCrossingRow,
} from "@/lib/map/passat-border-crossings";
import { dateSortKey } from "@/lib/admin/table-sort";
import { SortableHeader } from "@/components/admin/SortableHeader";
import { useTableSort } from "@/lib/admin/use-table-sort";

const STATS_TH = "pb-2 pr-3 font-medium";

function CountryCells({ row, strong = false }: { row: PassatCountryRow; strong?: boolean }) {
  const cell = strong
    ? "py-2.5 pr-3 tabular-nums text-foreground font-medium"
    : "py-2.5 pr-3 tabular-nums text-foreground";
  const labelCell = strong
    ? "py-2.5 pr-3 text-foreground font-medium"
    : "py-2.5 pr-3 text-foreground";

  return (
    <>
      <td className={labelCell}>{row.country}</td>
      <td className={cell}>{formatPassatNumber(row.totalKms)}</td>
      <td className={cell}>{formatPassatNumber(row.daysSpent)}</td>
      <td className={cell}>{formatPassatNumber(row.tanksFilled)}</td>
      <td className={cell}>
        {formatPassatNumber(row.averagePricePerLitreEur, row.averagePricePerLitreEur < 0.1 ? 3 : 2)}
      </td>
      <td className={cell}>{formatPassatEur(row.dieselSpentEur)}</td>
      <td className={cell}>{formatPassatEur(row.tollsEur)}</td>
      <td className={cell}>{formatPassatEur(row.insuranceEur)}</td>
      <td className={cell}>{formatPassatEur(row.otherEntryFeesEur)}</td>
      <td className={cell}>{formatPassatEur(row.finesEur)}</td>
      <td className={cell}>{formatPassatEur(row.carPartsEur)}</td>
      <td className={cell}>{formatPassatEur(row.totalEur)}</td>
    </>
  );
}

type PassatCountrySortKey = keyof PassatCountryRow;

const PASSAT_COUNTRY_ACCESSORS: Record<
  PassatCountrySortKey,
  (row: PassatCountryRow) => string | number
> = {
  country: (row) => row.country,
  totalKms: (row) => row.totalKms,
  daysSpent: (row) => row.daysSpent,
  tanksFilled: (row) => row.tanksFilled,
  averagePricePerLitreEur: (row) => row.averagePricePerLitreEur,
  dieselSpentEur: (row) => row.dieselSpentEur,
  tollsEur: (row) => row.tollsEur,
  insuranceEur: (row) => row.insuranceEur,
  otherEntryFeesEur: (row) => row.otherEntryFeesEur,
  finesEur: (row) => row.finesEur,
  carPartsEur: (row) => row.carPartsEur,
  totalEur: (row) => row.totalEur,
};

const PASSAT_COUNTRY_COLUMNS: { key: PassatCountrySortKey; label: string }[] = [
  { key: "country", label: "Country" },
  { key: "totalKms", label: "Total km" },
  { key: "daysSpent", label: "Days" },
  { key: "tanksFilled", label: "Tanks" },
  { key: "averagePricePerLitreEur", label: "Avg €/L" },
  { key: "dieselSpentEur", label: "Diesel" },
  { key: "tollsEur", label: "Tolls" },
  { key: "insuranceEur", label: "Insurance" },
  { key: "otherEntryFeesEur", label: "Entry fees" },
  { key: "finesEur", label: "Fines" },
  { key: "carPartsEur", label: "Car parts" },
  { key: "totalEur", label: "Total" },
];

type PassatBreakdownSortKey = "part" | "country" | "fixed" | "priceEur";

const PASSAT_BREAKDOWN_ACCESSORS: Record<
  PassatBreakdownSortKey,
  (row: PassatBreakdownRow) => string | number
> = {
  part: (row) => row.part,
  country: (row) => row.country,
  fixed: (row) => (row.fixed ? 1 : 0),
  priceEur: (row) => row.priceEur,
};

type BorderCrossingSortKey =
  | "departureCountry"
  | "entryCountry"
  | "borderName"
  | "date"
  | "entryTime"
  | "totalCrossingTime";

const BORDER_CROSSING_ACCESSORS: Record<
  BorderCrossingSortKey,
  (row: PassatBorderCrossingRow) => string | number
> = {
  departureCountry: (row) => row.departureCountry,
  entryCountry: (row) => row.entryCountry,
  borderName: (row) => row.borderName,
  date: (row) => (row.date ? dateSortKey(row.date) : "99999999999999"),
  entryTime: (row) => row.entryTime || "99:99",
  totalCrossingTime: (row) => crossingTimeMinutes(row.totalCrossingTime),
};

const BORDER_CROSSING_COLUMNS: { key: BorderCrossingSortKey; label: string }[] =
  [
    { key: "departureCountry", label: "Departure country" },
    { key: "entryCountry", label: "Entry country" },
    { key: "borderName", label: "Border name" },
    { key: "date", label: "Date" },
    { key: "entryTime", label: "Entry time" },
    { key: "totalCrossingTime", label: "Total crossing time" },
  ];

export function PassatRoadTripStats({
  borderCrossings,
}: {
  borderCrossings: PassatBorderCrossingRow[];
}) {
  const countrySort = useTableSort(PASSAT_COUNTRY_ROWS, PASSAT_COUNTRY_ACCESSORS);
  const breakdownSort = useTableSort(PASSAT_BREAKDOWN_ROWS, PASSAT_BREAKDOWN_ACCESSORS);
  const crossingSort = useTableSort(borderCrossings, BORDER_CROSSING_ACCESSORS);

  return (
    <div className="mt-8 space-y-10" data-testid="passat-road-trip-stats">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface/60 px-4 py-4">
          <p className="text-sm text-muted">Total distance</p>
          <p className="mt-1 font-display text-2xl text-foreground">
            {formatPassatNumber(PASSAT_COUNTRY_TOTALS.totalKms)} km
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface/60 px-4 py-4">
          <p className="text-sm text-muted">Days on the road</p>
          <p className="mt-1 font-display text-2xl text-foreground">
            {formatPassatNumber(PASSAT_COUNTRY_TOTALS.daysSpent)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface/60 px-4 py-4">
          <p className="text-sm text-muted">Trip total</p>
          <p className="mt-1 font-display text-2xl text-foreground">
            {formatPassatEur(PASSAT_COUNTRY_TOTALS.totalEur)}
          </p>
        </div>
      </div>

      <section data-testid="passat-country-costs">
        <h2 className="font-display text-lg text-foreground">
          Costs by country
        </h2>
        <p className="mt-1 text-sm text-muted">
          Distance, time, fuel, and other car costs across the road trip.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[64rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                {PASSAT_COUNTRY_COLUMNS.map((column, index) => (
                  <SortableHeader
                    key={column.key}
                    label={column.label}
                    columnKey={column.key}
                    activeKey={countrySort.sort?.key ?? null}
                    direction={countrySort.sort?.direction ?? null}
                    onSort={countrySort.onSort}
                    className={
                      index === PASSAT_COUNTRY_COLUMNS.length - 1
                        ? "pb-2 font-medium"
                        : STATS_TH
                    }
                    testId={`passat-country-sort-${column.key}`}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {countrySort.sorted.map((row) => (
                <tr
                  key={row.country}
                  className="border-b border-border/60"
                  data-testid={`passat-country-${row.country.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <CountryCells row={row} />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <CountryCells row={PASSAT_COUNTRY_TOTALS} strong />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section data-testid="passat-breakdowns">
        <h2 className="font-display text-lg text-foreground">
          Bits broken
        </h2>
        <p className="mt-1 text-sm text-muted">
          Mechanical issues along the way, where they happened, and repair cost.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <SortableHeader
                  label="Bits broken"
                  columnKey="part"
                  activeKey={breakdownSort.sort?.key ?? null}
                  direction={breakdownSort.sort?.direction ?? null}
                  onSort={breakdownSort.onSort}
                  className={STATS_TH}
                  testId="passat-breakdown-sort-part"
                />
                <SortableHeader
                  label="Country"
                  columnKey="country"
                  activeKey={breakdownSort.sort?.key ?? null}
                  direction={breakdownSort.sort?.direction ?? null}
                  onSort={breakdownSort.onSort}
                  className={STATS_TH}
                  testId="passat-breakdown-sort-country"
                />
                <SortableHeader
                  label="Fixed"
                  columnKey="fixed"
                  activeKey={breakdownSort.sort?.key ?? null}
                  direction={breakdownSort.sort?.direction ?? null}
                  onSort={breakdownSort.onSort}
                  className={STATS_TH}
                  testId="passat-breakdown-sort-fixed"
                />
                <SortableHeader
                  label="Price"
                  columnKey="priceEur"
                  activeKey={breakdownSort.sort?.key ?? null}
                  direction={breakdownSort.sort?.direction ?? null}
                  onSort={breakdownSort.onSort}
                  className="pb-2 font-medium"
                  testId="passat-breakdown-sort-price"
                />
              </tr>
            </thead>
            <tbody>
              {breakdownSort.sorted.map((row, index) => (
                <tr
                  key={`${row.part}-${row.country}-${index}`}
                  className="border-b border-border/60"
                >
                  <td className="py-2.5 pr-4 text-foreground">{row.part}</td>
                  <td className="py-2.5 pr-4 text-foreground">{row.country}</td>
                  <td className="py-2.5 pr-4 text-foreground">
                    {row.fixed ? "Yes" : "No"}
                  </td>
                  <td className="py-2.5 tabular-nums text-foreground">
                    {formatPassatEur(row.priceEur)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-medium text-foreground">
                <td className="pt-3 pr-4" colSpan={3}>
                  Total
                </td>
                <td className="pt-3 tabular-nums">
                  {formatPassatEur(PASSAT_BREAKDOWN_TOTAL_EUR)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section data-testid="passat-border-crossings">
        <h2 className="font-display text-lg text-foreground">
          Border crossing times
        </h2>
        <p className="mt-1 text-sm text-muted">
          Time spent at each land border on the Passat road trip.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                {BORDER_CROSSING_COLUMNS.map((column, index) => (
                  <SortableHeader
                    key={column.key}
                    label={column.label}
                    columnKey={column.key}
                    activeKey={crossingSort.sort?.key ?? null}
                    direction={crossingSort.sort?.direction ?? null}
                    onSort={crossingSort.onSort}
                    className={
                      index === BORDER_CROSSING_COLUMNS.length - 1
                        ? "pb-2 font-medium"
                        : STATS_TH
                    }
                    testId={`passat-border-sort-${column.key}`}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {crossingSort.sorted.map((row) => (
                <tr
                  key={`${row.sortIndex}-${row.departureCountry}-${row.entryCountry}-${row.date}`}
                  className="border-b border-border/60"
                >
                  <td className="py-2.5 pr-3 text-foreground">
                    {row.departureCountry}
                  </td>
                  <td className="py-2.5 pr-3 text-foreground">
                    {row.entryCountry}
                  </td>
                  <td className="py-2.5 pr-3 text-muted">
                    {displayBorderField(row.borderName)}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums text-foreground">
                    {displayBorderField(row.date)}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums text-foreground">
                    {displayBorderField(row.entryTime)}
                  </td>
                  <td className="py-2.5 tabular-nums text-foreground">
                    {row.totalCrossingTime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {borderCrossings.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No border crossings recorded yet.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
