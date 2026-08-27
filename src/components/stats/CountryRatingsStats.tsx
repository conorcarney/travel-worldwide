import {
  formatRatingScore,
  formatReturnVisit,
  type CountryRatingRow,
} from "@/lib/map/country-ratings";

function scoreCell(value: number | null, digits = 2) {
  return (
    <td className="py-2.5 pr-3 tabular-nums text-foreground">
      {formatRatingScore(value, digits)}
    </td>
  );
}

type CountryRatingsStatsProps = {
  rows: CountryRatingRow[];
};

export function CountryRatingsStats({ rows }: CountryRatingsStatsProps) {
  return (
    <div className="mt-8 space-y-6" data-testid="country-ratings-stats">
      <section>
        <h2 className="font-display text-lg text-foreground">
          My country ratings
        </h2>
        <p className="mt-1 text-sm text-muted">
          Personal scores by category. Overall rating is the average of those
          scores (drivers and roads only when set).{" "}
          {rows.length.toLocaleString("en-GB")} places rated.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[72rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="pb-2 pr-3 font-medium">Name</th>
                <th className="pb-2 pr-3 font-medium">Continent</th>
                <th className="pb-2 pr-3 font-medium">Culture</th>
                <th className="pb-2 pr-3 font-medium">Entertainment</th>
                <th className="pb-2 pr-3 font-medium">Landscapes</th>
                <th className="pb-2 pr-3 font-medium">Price</th>
                <th className="pb-2 pr-3 font-medium">Ease of entry</th>
                <th className="pb-2 pr-3 font-medium">Food</th>
                <th className="pb-2 pr-3 font-medium">Experiences</th>
                <th className="pb-2 pr-3 font-medium">Drivers</th>
                <th className="pb-2 pr-3 font-medium">Roads</th>
                <th className="pb-2 pr-3 font-medium">Rating</th>
                <th className="pb-2 pr-3 font-medium">Return</th>
                <th className="pb-2 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.name}-${row.continent}`}
                  className="border-b border-border/60 align-top"
                  data-testid={`country-rating-${row.name.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <td className="py-2.5 pr-3 text-foreground">{row.name}</td>
                  <td className="py-2.5 pr-3 text-muted">{row.continent}</td>
                  {scoreCell(row.culture, 1)}
                  {scoreCell(row.entertainment, 1)}
                  {scoreCell(row.landscapes, 1)}
                  {scoreCell(row.price, 1)}
                  {scoreCell(row.easeOfEntry, 1)}
                  {scoreCell(row.food, 1)}
                  {scoreCell(row.experiences, 1)}
                  {scoreCell(row.drivers, 1)}
                  {scoreCell(row.roads, 1)}
                  {scoreCell(row.rating, 2)}
                  <td className="py-2.5 pr-3 text-foreground">
                    {formatReturnVisit(row.returnVisit)}
                  </td>
                  <td className="py-2.5 text-muted">{row.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No country ratings yet. Add them from the admin page.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
