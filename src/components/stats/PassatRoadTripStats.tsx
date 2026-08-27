import {
  formatPassatEur,
  formatPassatNumber,
  PASSAT_AMOUNTS_TO_ADD,
  PASSAT_BREAKDOWN_ROWS,
  PASSAT_BREAKDOWN_TOTAL_EUR,
  PASSAT_COUNTRY_ROWS,
  PASSAT_COUNTRY_TOTALS,
  type PassatCountryRow,
} from "@/lib/map/passat-road-trip";

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

export function PassatRoadTripStats() {
  const tollsToAdd = PASSAT_AMOUNTS_TO_ADD.tollsEur.reduce((sum, value) => sum + value, 0);

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
                <th className="pb-2 pr-3 font-medium">Country</th>
                <th className="pb-2 pr-3 font-medium">Total km</th>
                <th className="pb-2 pr-3 font-medium">Days</th>
                <th className="pb-2 pr-3 font-medium">Tanks</th>
                <th className="pb-2 pr-3 font-medium">Avg €/L</th>
                <th className="pb-2 pr-3 font-medium">Diesel</th>
                <th className="pb-2 pr-3 font-medium">Tolls</th>
                <th className="pb-2 pr-3 font-medium">Insurance</th>
                <th className="pb-2 pr-3 font-medium">Entry fees</th>
                <th className="pb-2 pr-3 font-medium">Fines</th>
                <th className="pb-2 pr-3 font-medium">Car parts</th>
                <th className="pb-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {PASSAT_COUNTRY_ROWS.map((row) => (
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
                <th className="pb-2 pr-4 font-medium">Bits broken</th>
                <th className="pb-2 pr-4 font-medium">Country</th>
                <th className="pb-2 pr-4 font-medium">Fixed</th>
                <th className="pb-2 font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {PASSAT_BREAKDOWN_ROWS.map((row, index) => (
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
    </div>
  );
}
