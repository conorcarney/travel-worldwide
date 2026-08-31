"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  dateSortKey,
  nextSortState,
  sortRows,
  type SortState,
} from "@/lib/admin/table-sort";
import { AdminInlineInput } from "@/components/admin/AdminInlineField";
import { SortableHeader } from "@/components/admin/SortableHeader";
import { normalizeCountryList, listCountryNames } from "@/lib/map/countries";
import { countryListWriteSchema } from "@/lib/validations/country-list-write";
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
  const [rowDraft, setRowDraft] = useState<VisitedFormState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [countryListMessage, setCountryListMessage] = useState<string | null>(
    null,
  );
  const [countryListName, setCountryListName] = useState("");
  const [countryListSaving, setCountryListSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState<SortState<VisitedSortKey>>({
    key: "name",
    direction: "asc",
  });

  const sortedVisited = sortRows(visited, sort, {
    name: (item) => item.name ?? "",
    date: (item) => dateSortKey(item.date ?? ""),
  });

  const visitedNames = useMemo(
    () =>
      new Set(
        visited
          .map((item) => item.name?.trim().toLowerCase())
          .filter(Boolean),
      ),
    [visited],
  );

  const unvisitedCountryOptions = useMemo(
    () =>
      countryOptions.filter(
        (name) => !visitedNames.has(name.trim().toLowerCase()),
      ),
    [countryOptions, visitedNames],
  );

  async function loadVisited(quiet = false) {
    if (!quiet) {
      setStatus("loading");
      setMessage(null);
    }
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
          setCountryOptions(
            listCountryNames(normalizeCountryList(countryBody.data ?? [])),
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

  function updateRow<K extends keyof VisitedFormState>(
    key: K,
    value: VisitedFormState[K],
  ) {
    setRowDraft((current) =>
      current ? { ...current, [key]: value } : current,
    );
  }

  function startEdit(item: VisitedRecord) {
    setEditingId(item._id);
    setRowDraft(toFormState(item));
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setRowDraft(null);
  }

  function resetForm() {
    setForm(EMPTY_FORM_STATE);
  }

  async function saveRecord(payload: VisitedFormState, id?: string) {
    const parsed = visitedWriteSchema.safeParse({
      name: payload.name,
      date: payload.date,
      other_visit_dates: payload.other_visit_dates,
    });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Invalid country");
      return false;
    }

    setSaving(true);
    try {
      const response = await fetch(
        id ? `/api/visited/${id}` : "/api/visited",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );
      const body = (await response.json()) as {
        ok: boolean;
        data?: VisitedRecord;
        error?: string;
      };
      if (!response.ok || !body.ok || !body.data) {
        throw new Error(body.error ?? "Save failed");
      }
      const saved = body.data;
      if (id) {
        cancelEdit();
        setVisited((current) =>
          current.map((row) => (row._id === id ? saved : row)),
        );
      } else {
        resetForm();
        setVisited((current) => [saved, ...current]);
      }
      setMessage(id ? "Visited country updated." : "Visited country added.");
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

  async function onDeleteCountryFromList(name: string) {
    if (
      !window.confirm(
        `Remove "${name}" from the total country list? This affects map pickers and statistics.`,
      )
    ) {
      return;
    }
    setCountryListMessage(null);
    setCountryListSaving(true);
    try {
      const response = await fetch(
        `/api/country-list?name=${encodeURIComponent(name)}`,
        { method: "DELETE" },
      );
      const body = (await response.json()) as {
        ok: boolean;
        data?: string[];
        error?: string;
      };
      if (!response.ok || !body.ok || !body.data) {
        throw new Error(body.error ?? "Delete failed");
      }
      setCountryOptions(body.data);
      setCountryListMessage(`Removed "${name}" from the country list.`);
    } catch (error) {
      setCountryListMessage(
        error instanceof Error ? error.message : "Delete failed",
      );
    } finally {
      setCountryListSaving(false);
    }
  }

  async function onAddCountryToList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCountryListMessage(null);
    const parsed = countryListWriteSchema.safeParse({ name: countryListName });
    if (!parsed.success) {
      setCountryListMessage(
        parsed.error.issues[0]?.message ?? "Invalid country",
      );
      return;
    }

    setCountryListSaving(true);
    try {
      const response = await fetch("/api/country-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await response.json()) as {
        ok: boolean;
        data?: string[];
        error?: string;
      };
      if (!response.ok || !body.ok || !body.data) {
        throw new Error(body.error ?? "Add failed");
      }
      setCountryOptions(body.data);
      setCountryListName("");
      setCountryListMessage(`Added "${parsed.data.name}" to the country list.`);
    } catch (error) {
      setCountryListMessage(error instanceof Error ? error.message : "Add failed");
    } finally {
      setCountryListSaving(false);
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
      if (editingId === id) cancelEdit();
      setVisited((current) => current.filter((row) => row._id !== id));
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
          Dates can include a 24-hour time (e.g. 19/01/2023 14:30).
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 border border-border bg-surface/60 p-4 sm:grid-cols-2"
        data-testid="visited-form"
      >
        <h2 className="font-display text-xl text-foreground sm:col-span-2">
          Add visited country
        </h2>

        <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2">
          Country name
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            list="visited-country-add-options"
            placeholder="Ireland"
            data-testid="visited-name"
            required
          />
          <datalist id="visited-country-add-options">
            {unvisitedCountryOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
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
            placeholder="06/2018 or 19/01/2023 14:30"
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
            placeholder="08/2020, 03/2022, 19/01/2023 14:30"
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
            {saving ? "Saving…" : "Add country"}
          </button>
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
                {sortedVisited.map((item) => {
                  const editing = editingId === item._id ? rowDraft : null;
                  if (!editing) {
                    return (
                      <tr
                        key={item._id}
                        className="border-t border-border text-foreground"
                      >
                        <td className="px-3 py-2 align-top">{item.name}</td>
                        <td className="px-3 py-2 align-top whitespace-nowrap text-muted">
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
                    );
                  }

                  return (
                    <tr
                      key={item._id}
                      className="border-t border-border bg-surface/70 text-foreground"
                      data-testid="visited-inline-row"
                    >
                      <td className="px-3 py-2 align-top">
                        <AdminInlineInput
                          value={editing.name}
                          onChange={(event) =>
                            updateRow("name", event.target.value)
                          }
                          onSave={() => void saveRow()}
                          onCancel={cancelEdit}
                          list="visited-country-options"
                          data-testid="visited-inline-name"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <AdminInlineInput
                          value={editing.date}
                          onChange={(event) =>
                            updateRow("date", event.target.value)
                          }
                          onSave={() => void saveRow()}
                          onCancel={cancelEdit}
                          className="min-w-[11rem]"
                          data-testid="visited-inline-date"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <AdminInlineInput
                          value={editing.other_visit_dates}
                          onChange={(event) =>
                            updateRow("other_visit_dates", event.target.value)
                          }
                          onSave={() => void saveRow()}
                          onCancel={cancelEdit}
                          data-testid="visited-inline-other-dates"
                        />
                      </td>
                      <td className="px-3 py-2 align-top whitespace-nowrap">
                        <button
                          type="button"
                          className="mr-3 text-accent hover:underline disabled:opacity-60"
                          disabled={saving}
                          onClick={() => void saveRow()}
                          data-testid="visited-inline-save"
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          className="mr-3 text-foreground hover:underline"
                          onClick={cancelEdit}
                          data-testid="visited-inline-cancel"
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
            {sortedVisited.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted">
                No visited countries yet.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section
        className="grid gap-4 border border-border bg-surface/60 p-4"
        data-testid="country-list-admin"
      >
        <div>
          <h2 className="font-display text-xl text-foreground">
            Manage country list
          </h2>
          <p className="mt-1 text-sm text-muted">
            Add or remove countries from the master list used by the map,
            visited picker, and statistics. New entries are name-only until map
            geometry is added separately.
          </p>
        </div>

        <form
          onSubmit={onAddCountryToList}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          data-testid="country-list-form"
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-muted">
            Country name
            <input
              className="rounded border border-border bg-background px-3 py-2 text-foreground"
              value={countryListName}
              onChange={(event) => setCountryListName(event.target.value)}
              placeholder="Abkhazia"
              data-testid="country-list-name"
              required
            />
          </label>
          <button
            type="submit"
            disabled={countryListSaving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            data-testid="country-list-add"
          >
            {countryListSaving ? "Saving…" : "Add to list"}
          </button>
        </form>

        {countryListMessage ? (
          <p className="text-sm text-muted" data-testid="country-list-message">
            {countryListMessage}
          </p>
        ) : null}

        <div className="overflow-x-auto border border-border">
          <table
            className="min-w-full text-left text-sm"
            data-testid="country-list-table"
          >
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Country / territory</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {countryOptions.map((name) => (
                <tr
                  key={name}
                  className="border-t border-border text-foreground"
                  data-testid={`country-list-row-${name.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <td className="px-3 py-2">{name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button
                      type="button"
                      className="text-red-300 hover:underline disabled:opacity-60"
                      disabled={countryListSaving}
                      onClick={() => void onDeleteCountryFromList(name)}
                      data-testid={`country-list-delete-${name.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {countryOptions.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted">
              No countries on the list yet.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
