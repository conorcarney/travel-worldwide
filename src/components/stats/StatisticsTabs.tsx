"use client";

import { useState, type ReactNode } from "react";

type StatisticsTabId = "overall" | "passat" | "ratings";

const TABS: { id: StatisticsTabId; label: string }[] = [
  { id: "overall", label: "Overall" },
  { id: "passat", label: "Passat Roadtrip" },
  { id: "ratings", label: "Country Ratings" },
];

type StatisticsTabsProps = {
  overall: ReactNode;
  passat?: ReactNode;
  ratings?: ReactNode;
};

export function StatisticsTabs({
  overall,
  passat,
  ratings,
}: StatisticsTabsProps) {
  const [activeTab, setActiveTab] = useState<StatisticsTabId>("overall");

  return (
    <div className="mt-8" data-testid="statistics-tabs">
      <div
        className="flex flex-wrap gap-2 border-b border-border pb-3"
        role="tablist"
        aria-label="Statistics views"
      >
        {TABS.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`statistics-tab-${tab.id}`}
              aria-controls={`statistics-panel-${tab.id}`}
              className={
                selected
                  ? "rounded-md border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-md border border-border bg-transparent px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
              }
              onClick={() => setActiveTab(tab.id)}
              data-testid={`statistics-tab-${tab.id}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="statistics-panel-overall"
        aria-labelledby="statistics-tab-overall"
        hidden={activeTab !== "overall"}
        data-testid="statistics-panel-overall"
      >
        {overall}
      </div>

      <div
        role="tabpanel"
        id="statistics-panel-passat"
        aria-labelledby="statistics-tab-passat"
        hidden={activeTab !== "passat"}
        data-testid="statistics-panel-passat"
      >
        {passat ?? (
          <p className="mt-8 text-sm text-muted">
            Passat Road trip statistics will appear here.
          </p>
        )}
      </div>

      <div
        role="tabpanel"
        id="statistics-panel-ratings"
        aria-labelledby="statistics-tab-ratings"
        hidden={activeTab !== "ratings"}
        data-testid="statistics-panel-ratings"
      >
        {ratings ?? (
          <p className="mt-8 text-sm text-muted">
            Country ratings will appear here.
          </p>
        )}
      </div>
    </div>
  );
}
