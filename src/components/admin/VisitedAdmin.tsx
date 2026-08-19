"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { revealAdminForm } from "@/lib/admin/focus-form";
import {
  dateSortKey,
  nextSortState,
  sortRows,
  type SortState,
} from "@/lib/admin/table-sort";
import { SortableHeader } from "@/components/admin/SortableHeader";
import { normalizeCountryList } from "@/lib/map/countries";
import {
  visitedWriteSchema,
  type VisitedRecord,
} from "@/lib/validations/visited-write";

type VisitedSortKey = "name" | "date";

type VisitedFormState = {
  name: string;
  date: string;
  other_visit_dates: string;
};

const EMPTY_FORM_STATE: VisitedFormState = {
  name: "",
  date: "",
  other_visit_dates: "",
};

function toFormState(visited: VisitedRecord): VisitedFormState {
  return {
    name: visited.name ?? "",
    date: visited.date ?? "",
    other_visit_dates: visited.other_visit_dates ?? "",
  };
}

export function VisitedAdmin() {
  const [visited, setVisited] = useState<VisitedRecord[]>([]);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [form, setForm] = useState<VisitedFormState>(EMPTY_FORM_STATE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState<SortState<VisitedSortKey>>({
    key: "name",
    direction: "asc",
  });
  const formRef = useRef<HTMLFormElement>(null);

  const sortedVisited = sortRows(visited, sort, {
    name: (item) => item.name ?? "",
    date: (item) => dateSortKey(item.date ?? ""),
  });

  async function loadVisited() {
    setStatus("loading");
    setMessage(null);
    try {
      const [visitedRes, countryListRes] = await Promise.all([
        fetch("/api/visited"),
        fetch("/api/country-list"),
      ]);

      const visitedBody = (await visitedRes.json()) as {
        ok: boolean;
        data?: VisitedRecord[];
        error?: string;
      };
      if (!visitedRes.ok || !visitedBody.ok) {
        throw new Error(visitedBody.error ?? "Failed to load visited countries");
      }

      if (countryListRes.ok) {
        const countryBody = (await countryListRes.json()) as {
          ok: boolean;
          data?: unknown[];
        };
        if (countryBody.ok) {
          const geo = normalizeCountryList(countryBody.data ?? []);
          const names = geo.features
            .map((feature) => {
              const name = feature.properties.name;
              return typeof name === "string" ? name.trim() : "";
            })
            .filter(Boolean);
          setCountryOptions(
            [...new Set(names)].sort((a, b) =>
              a.localeCompare(b, undefined, { sensitivity: "base" }),
            ),
          );
        }
      }

      setVisited(visitedBody.data ?? []);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to load");
    }
  }

  useEffect(() => {
    void loadVisited();
  }, []);

  function updateField<K extends keyof VisitedFormState>(
    key: K,
    value: VisitedFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startEdit(item: VisitedRecord) {
    setEditingId(item._id);
    setForm(toFormState(item));
    setMessage(null);
    revealAdminForm(formRef.current);
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM_STATE);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const parsed = visitedWriteSchema.safeParse({
      name: form.name,
      date: form.date,
      other_visit_dates: form.other_visit_dates,
    });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Invalid country");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editingId ? `/api/visited/${editingId}` : "/api/visited",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Save failed");
      }
      resetForm();
      await loadVisited();
      setMessage(editingId ? "Visited country updated." : "Visited country added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Remove this country from visited?")) return;
    setMessage(null);
    try {
      const response = await fetch(`/api/visited/${id}`, { method: "DELETE" });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Delete failed");
      }
      if (editingId === id) resetForm();
      await loadVisited();
      setMessage("Visited country removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">
          Visited countries
        </h1>
        <p className="mt-2 text-sm text-muted">
          Add, rename, or remove countries from your visited list. Names should
          match the map country names where possible. Use first visited for the
          earliest trip, and other visit dates for later comma-separated dates.
        </p>
      </div>

      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="grid gap-4 border border-border bg-surface/60 p-4 sm:grid-cols-2"
        data-testid="visited-form"
      >
        <h2 className="font-display text-xl text-foreground sm:col-span-2">
          {editingId ? "Update visited country" : "Add visited country"}
        </h2>

        <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2">
          Country name
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            list="visited-country-options"
            placeholder="Ireland"
            data-testid="visited-name"
            required
          />
          <datalist id="visited-country-options">
            {countryOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          First visited (optional)
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.date}
            onChange={(event) => updateField("date", event.target.value)}
            placeholder="06/2018 or 19/01/2023"
            data-testid="visited-date"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Other visit dates (optional)
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.other_visit_dates}
            onChange={(event) =>
              updateField("other_visit_dates", event.target.value)
            }
            placeholder="08/2020, 03/2022, 19/01/2023"
            data-testid="visited-other-dates"
          />
        </label>

        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            data-testid="visited-save"
          >
            {saving
              ? "Saving…"
              : editingId
                ? "Update country"
                : "Add country"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      {message ? (
        <p className="text-sm text-muted" data-testid="visited-admin-message">
          {message}
        </p>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-foreground">
            Visited ({sortedVisited.length})
          </h2>
          <button
            type="button"
            onClick={() => void loadVisited()}
            className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            Refresh
          </button>
        </div>

        {status === "loading" ? (
          <p className="text-sm text-muted">Loading visited countries…</p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm text-red-300">{message}</p>
        ) : null}

        {status === "ready" ? (
          <div className="overflow-x-auto border border-border">
            <table
              className="min-w-full text-left text-sm"
              data-testid="visited-table"
            >
              <thead className="bg-surface text-muted">
                <tr>
                  <SortableHeader
                    label="Country"
                    columnKey="name"
                    activeKey={sort.key}
                    direction={sort.direction}
                    onSort={(key) => setSort((current) => nextSortState(current, key))}
                  />
                  <SortableHeader
                    label="First visited"
                    columnKey="date"
                    activeKey={sort.key}
                    direction={sort.direction}
                    onSort={(key) => setSort((current) => nextSortState(current, key))}
                  />
                  <th className="px-3 py-2 font-medium">Other visit dates</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedVisited.map((item) => (
                  <tr
                    key={item._id}
                    className="border-t border-border text-foreground"
                  >
                    <td className="px-3 py-2 align-top">{item.name}</td>
                    <td className="px-3 py-2 align-top text-muted">
                      {item.date || "—"}
                    </td>
                    <td className="px-3 py-2 align-top text-muted">
                      {item.other_visit_dates || "—"}
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
                ))}
              </tbody>
            </table>
            {sortedVisited.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted">
                No visited countries yet.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
