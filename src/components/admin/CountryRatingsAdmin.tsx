"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  nextSortState,
  sortRows,
  type SortState,
} from "@/lib/admin/table-sort";
import {
  AdminInlineInput,
  AdminInlineSelect,
} from "@/components/admin/AdminInlineField";
import { SortableHeader } from "@/components/admin/SortableHeader";
import {
  countryRatingWriteSchema,
  type CountryRatingRecord,
} from "@/lib/validations/country-rating-write";
import { computeCountryRatingAverage } from "@/lib/map/country-ratings";

type RatingSortKey = "name" | "continent" | "rating";

type RatingFormState = {
  name: string;
  continent: string;
  culture: string;
  entertainment: string;
  landscapes: string;
  price: string;
  easeOfEntry: string;
  food: string;
  experiences: string;
  drivers: string;
  roads: string;
  returnVisit: string;
  reason: string;
};

const EMPTY_FORM: RatingFormState = {
  name: "",
  continent: "",
  culture: "",
  entertainment: "",
  landscapes: "",
  price: "",
  easeOfEntry: "",
  food: "",
  experiences: "",
  drivers: "",
  roads: "",
  returnVisit: "",
  reason: "",
};

const SCORE_FIELDS = [
  ["culture", "Culture"],
  ["entertainment", "Entertainment"],
  ["landscapes", "Landscapes"],
  ["price", "Price"],
  ["easeOfEntry", "Ease of entry"],
  ["food", "Food"],
  ["experiences", "Experiences"],
  ["drivers", "Drivers"],
  ["roads", "Roads"],
] as const;

function toFormState(rating: CountryRatingRecord): RatingFormState {
  return {
    name: rating.name ?? "",
    continent: rating.continent ?? "",
    culture: rating.culture == null ? "" : String(rating.culture),
    entertainment:
      rating.entertainment == null ? "" : String(rating.entertainment),
    landscapes: rating.landscapes == null ? "" : String(rating.landscapes),
    price: rating.price == null ? "" : String(rating.price),
    easeOfEntry: rating.easeOfEntry == null ? "" : String(rating.easeOfEntry),
    food: rating.food == null ? "" : String(rating.food),
    experiences: rating.experiences == null ? "" : String(rating.experiences),
    drivers: rating.drivers == null ? "" : String(rating.drivers),
    roads: rating.roads == null ? "" : String(rating.roads),
    returnVisit: rating.returnVisit ?? "",
    reason: rating.reason ?? "",
  };
}

function draftAverage(draft: RatingFormState): number | null {
  const parsed = countryRatingWriteSchema.safeParse(draft);
  if (!parsed.success) return null;
  return computeCountryRatingAverage(parsed.data);
}

function scoreLabel(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("en-GB", {
    maximumFractionDigits: 2,
  });
}

export function CountryRatingsAdmin() {
  const [ratings, setRatings] = useState<CountryRatingRecord[]>([]);
  const [form, setForm] = useState<RatingFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<RatingFormState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState<SortState<RatingSortKey>>({
    key: "name",
    direction: "asc",
  });

  const sortedRatings = sortRows(ratings, sort, {
    name: (item) => item.name ?? "",
    continent: (item) => item.continent ?? "",
    rating: (item) => item.rating ?? -1,
  });

  async function loadRatings(quiet = false) {
    if (!quiet) {
      setStatus("loading");
      setMessage(null);
    }
    try {
      const response = await fetch("/api/country-ratings");
      const body = (await response.json()) as {
        ok: boolean;
        data?: CountryRatingRecord[];
        error?: string;
      };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to load country ratings");
      }
      setRatings(
        (body.data ?? []).map((row) => ({
          ...row,
          rating: computeCountryRatingAverage(row),
        })),
      );
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to load");
    }
  }

  useEffect(() => {
    void loadRatings();
  }, []);

  function updateField<K extends keyof RatingFormState>(
    key: K,
    value: RatingFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateRow<K extends keyof RatingFormState>(
    key: K,
    value: RatingFormState[K],
  ) {
    setRowDraft((current) =>
      current ? { ...current, [key]: value } : current,
    );
  }

  function startEdit(item: CountryRatingRecord) {
    setEditingId(item._id);
    setRowDraft(toFormState(item));
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setRowDraft(null);
  }

  async function saveRecord(payload: RatingFormState, id?: string) {
    const parsed = countryRatingWriteSchema.safeParse(payload);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Invalid rating");
      return false;
    }

    setSaving(true);
    try {
      const response = await fetch(
        id ? `/api/country-ratings/${id}` : "/api/country-ratings",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );
      const body = (await response.json()) as {
        ok: boolean;
        data?: CountryRatingRecord;
        error?: string;
      };
      if (!response.ok || !body.ok || !body.data) {
        throw new Error(body.error ?? "Save failed");
      }
      const saved = body.data;
      if (id) {
        cancelEdit();
        setRatings((current) =>
          current.map((row) => (row._id === id ? saved : row)),
        );
      } else {
        setForm(EMPTY_FORM);
        setRatings((current) => [saved, ...current]);
      }
      setMessage(id ? "Country rating updated." : "Country rating added.");
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    await saveRecord(form);
  }

  async function saveRow() {
    if (!editingId || !rowDraft) return;
    setMessage(null);
    await saveRecord(rowDraft, editingId);
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this country rating?")) return;
    setMessage(null);
    try {
      const response = await fetch(`/api/country-ratings/${id}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Delete failed");
      }
      if (editingId === id) cancelEdit();
      setRatings((current) => current.filter((row) => row._id !== id));
      setMessage("Country rating removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    }
  }

  async function seedRatings(force = false) {
    if (
      force &&
      !window.confirm(
        "Replace all existing country ratings with the spreadsheet seed data?",
      )
    ) {
      return;
    }
    setMessage(null);
    setSaving(true);
    try {
      const response = await fetch("/api/country-ratings/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const body = (await response.json()) as {
        ok: boolean;
        data?: { inserted: number; skipped: boolean };
        error?: string;
      };
      if (!response.ok || !body.ok || !body.data) {
        throw new Error(body.error ?? "Seed failed");
      }
      if (body.data.skipped) {
        setMessage(
          "Country ratings already exist. Use replace seed to overwrite them.",
        );
      } else {
        setMessage(
          `Imported ${body.data.inserted.toLocaleString("en-GB")} country ratings.`,
        );
        await loadRatings(true);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Seed failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">
          Country ratings
        </h1>
        <p className="mt-2 text-sm text-muted">
          Add, edit, or remove personal country ratings used on the statistics
          page. The overall rating is the average of the category scores
          (drivers and roads only count when filled in).
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-3 border border-border bg-surface/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="country-ratings-form"
      >
        <h2 className="font-display text-xl text-foreground sm:col-span-2 lg:col-span-4">
          Add country rating
        </h2>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Country name
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            required
            data-testid="country-rating-name"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Continent
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.continent}
            onChange={(event) => updateField("continent", event.target.value)}
            required
            data-testid="country-rating-continent"
          />
        </label>

        {SCORE_FIELDS.map(([key, label]) => (
          <label key={key} className="flex flex-col gap-1 text-sm text-muted">
            {label}
            <input
              type="number"
              step="any"
              min={0}
              max={10}
              className="rounded border border-border bg-background px-3 py-2 text-foreground"
              value={form[key]}
              onChange={(event) => updateField(key, event.target.value)}
              required={key !== "drivers" && key !== "roads"}
              data-testid={`country-rating-${key}`}
            />
          </label>
        ))}

        <div className="flex flex-col gap-1 text-sm text-muted">
          <span>Rating (average)</span>
          <p
            className="rounded border border-border bg-background px-3 py-2 tabular-nums text-foreground"
            data-testid="country-rating-average"
          >
            {scoreLabel(draftAverage(form))}
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Return
          <select
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.returnVisit}
            onChange={(event) => updateField("returnVisit", event.target.value)}
            data-testid="country-rating-return"
          >
            <option value="">—</option>
            <option value="Y">Yes</option>
            <option value="N">No</option>
            <option value="M">Maybe</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2 lg:col-span-3">
          Reason
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.reason}
            onChange={(event) => updateField("reason", event.target.value)}
            data-testid="country-rating-reason"
          />
        </label>

        <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            data-testid="country-rating-save"
          >
            {saving ? "Saving…" : "Add rating"}
          </button>
        </div>
      </form>

      {message ? (
        <p className="text-sm text-muted" data-testid="country-ratings-message">
          {message}
        </p>
      ) : null}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-foreground">
            Ratings ({sortedRatings.length})
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void seedRatings(false)}
              disabled={saving}
              className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline disabled:opacity-60"
              data-testid="country-ratings-seed"
            >
              Import spreadsheet seed
            </button>
            <button
              type="button"
              onClick={() => void seedRatings(true)}
              disabled={saving}
              className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline disabled:opacity-60"
              data-testid="country-ratings-seed-force"
            >
              Replace with seed
            </button>
            <button
              type="button"
              onClick={() => void loadRatings()}
              className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
            >
              Refresh
            </button>
          </div>
        </div>

        {status === "loading" ? (
          <p className="text-sm text-muted">Loading country ratings…</p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm text-red-300">{message}</p>
        ) : null}

        {status === "ready" ? (
          <div className="overflow-x-auto border border-border">
            <table
              className="min-w-[72rem] text-left text-sm"
              data-testid="country-ratings-table"
            >
              <thead className="bg-surface text-muted">
                <tr>
                  <SortableHeader
                    label="Country"
                    columnKey="name"
                    activeKey={sort.key}
                    direction={sort.direction}
                    onSort={(key) =>
                      setSort((current) => nextSortState(current, key))
                    }
                  />
                  <SortableHeader
                    label="Continent"
                    columnKey="continent"
                    activeKey={sort.key}
                    direction={sort.direction}
                    onSort={(key) =>
                      setSort((current) => nextSortState(current, key))
                    }
                  />
                  <th className="px-3 py-2 font-medium">Culture</th>
                  <th className="px-3 py-2 font-medium">Ent.</th>
                  <th className="px-3 py-2 font-medium">Land</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                  <th className="px-3 py-2 font-medium">Entry</th>
                  <th className="px-3 py-2 font-medium">Food</th>
                  <th className="px-3 py-2 font-medium">Exp.</th>
                  <th className="px-3 py-2 font-medium">Drivers</th>
                  <th className="px-3 py-2 font-medium">Roads</th>
                  <SortableHeader
                    label="Rating"
                    columnKey="rating"
                    activeKey={sort.key}
                    direction={sort.direction}
                    onSort={(key) =>
                      setSort((current) => nextSortState(current, key))
                    }
                  />
                  <th className="px-3 py-2 font-medium">Return</th>
                  <th className="px-3 py-2 font-medium">Reason</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRatings.map((item) => {
                  const editing = editingId === item._id ? rowDraft : null;
                  if (!editing) {
                    return (
                      <tr
                        key={item._id}
                        className="border-t border-border text-foreground"
                      >
                        <td className="px-3 py-2 align-top">{item.name}</td>
                        <td className="px-3 py-2 align-top text-muted">
                          {item.continent}
                        </td>
                        <td className="px-3 py-2 align-top tabular-nums">
                          {scoreLabel(item.culture)}
                        </td>
                        <td className="px-3 py-2 align-top tabular-nums">
                          {scoreLabel(item.entertainment)}
                        </td>
                        <td className="px-3 py-2 align-top tabular-nums">
                          {scoreLabel(item.landscapes)}
                        </td>
                        <td className="px-3 py-2 align-top tabular-nums">
                          {scoreLabel(item.price)}
                        </td>
                        <td className="px-3 py-2 align-top tabular-nums">
                          {scoreLabel(item.easeOfEntry)}
                        </td>
                        <td className="px-3 py-2 align-top tabular-nums">
                          {scoreLabel(item.food)}
                        </td>
                        <td className="px-3 py-2 align-top tabular-nums">
                          {scoreLabel(item.experiences)}
                        </td>
                        <td className="px-3 py-2 align-top tabular-nums">
                          {scoreLabel(item.drivers)}
                        </td>
                        <td className="px-3 py-2 align-top tabular-nums">
                          {scoreLabel(item.roads)}
                        </td>
                        <td className="px-3 py-2 align-top tabular-nums">
                          {scoreLabel(item.rating)}
                        </td>
                        <td className="px-3 py-2 align-top">
                          {item.returnVisit === "Y"
                            ? "Yes"
                            : item.returnVisit === "N"
                              ? "No"
                              : item.returnVisit === "M"
                                ? "Maybe"
                                : "—"}
                        </td>
                        <td className="px-3 py-2 align-top text-muted">
                          {item.reason || "—"}
                        </td>
                        <td className="px-3 py-2 align-top whitespace-nowrap">
                          <button
                            type="button"
                            className="mr-3 text-accent hover:underline"
                            onClick={() => startEdit(item)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-red-300 hover:underline"
                            onClick={() => void onDelete(item._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={item._id}
                      className="border-t border-border bg-surface/70 text-foreground"
                      data-testid="country-rating-inline-row"
                    >
                      <td className="px-3 py-2 align-top">
                        <AdminInlineInput
                          value={editing.name}
                          onChange={(event) =>
                            updateRow("name", event.target.value)
                          }
                          onSave={() => void saveRow()}
                          onCancel={cancelEdit}
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <AdminInlineInput
                          value={editing.continent}
                          onChange={(event) =>
                            updateRow("continent", event.target.value)
                          }
                          onSave={() => void saveRow()}
                          onCancel={cancelEdit}
                        />
                      </td>
                      {SCORE_FIELDS.map(([key]) => (
                        <td key={key} className="px-3 py-2 align-top">
                          <AdminInlineInput
                            type="number"
                            step="any"
                            min={0}
                            max={10}
                            value={editing[key]}
                            onChange={(event) =>
                              updateRow(key, event.target.value)
                            }
                            onSave={() => void saveRow()}
                            onCancel={cancelEdit}
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 align-top tabular-nums text-muted">
                        {scoreLabel(draftAverage(editing))}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <AdminInlineSelect
                          value={editing.returnVisit}
                          onChange={(event) =>
                            updateRow("returnVisit", event.target.value)
                          }
                          onSave={() => void saveRow()}
                          onCancel={cancelEdit}
                        >
                          <option value="">—</option>
                          <option value="Y">Yes</option>
                          <option value="N">No</option>
                          <option value="M">Maybe</option>
                        </AdminInlineSelect>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <AdminInlineInput
                          value={editing.reason}
                          onChange={(event) =>
                            updateRow("reason", event.target.value)
                          }
                          onSave={() => void saveRow()}
                          onCancel={cancelEdit}
                        />
                      </td>
                      <td className="px-3 py-2 align-top whitespace-nowrap">
                        <button
                          type="button"
                          className="mr-3 text-accent hover:underline disabled:opacity-60"
                          disabled={saving}
                          onClick={() => void saveRow()}
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          className="mr-3 text-foreground hover:underline"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="text-red-300 hover:underline"
                          onClick={() => void onDelete(item._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {sortedRatings.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted">
                No country ratings yet. Import the spreadsheet seed or add one
                above.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
