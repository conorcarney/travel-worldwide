"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  dateSortKey,
  nextSortState,
  sortRows,
  type SortState,
} from "@/lib/admin/table-sort";
import { AdminInlineInput } from "@/components/admin/AdminInlineField";
import { AdminSearchBar } from "@/components/admin/AdminSearchBar";
import { SortableHeader } from "@/components/admin/SortableHeader";
import { filterRowsByQuery } from "@/lib/admin/search";
import { crossingTimeMinutes } from "@/lib/map/passat-border-crossings";
import {
  passatBorderCrossingWriteSchema,
  type PassatBorderCrossingRecord,
} from "@/lib/validations/passat-border-crossing-write";

type CrossingSortKey =
  | "sortIndex"
  | "departureCountry"
  | "entryCountry"
  | "borderName"
  | "date"
  | "entryTime"
  | "totalCrossingTime";

type CrossingFormState = {
  departureCountry: string;
  entryCountry: string;
  borderName: string;
  date: string;
  entryTime: string;
  totalCrossingTime: string;
};

const EMPTY_FORM: CrossingFormState = {
  departureCountry: "",
  entryCountry: "",
  borderName: "",
  date: "",
  entryTime: "",
  totalCrossingTime: "",
};

function toFormState(row: PassatBorderCrossingRecord): CrossingFormState {
  return {
    departureCountry: row.departureCountry ?? "",
    entryCountry: row.entryCountry ?? "",
    borderName: row.borderName ?? "",
    date: row.date ?? "",
    entryTime: row.entryTime ?? "",
    totalCrossingTime: row.totalCrossingTime ?? "",
  };
}

function dash(value: string): string {
  return value.trim() ? value : "—";
}

function haystack(row: PassatBorderCrossingRecord): string {
  return [
    row.departureCountry,
    row.entryCountry,
    row.borderName,
    row.date,
    row.entryTime,
    row.totalCrossingTime,
  ].join(" ");
}

export function PassatBorderCrossingsAdmin() {
  const [rows, setRows] = useState<PassatBorderCrossingRecord[]>([]);
  const [form, setForm] = useState<CrossingFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<CrossingFormState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<CrossingSortKey>>({
    key: "sortIndex",
    direction: "asc",
  });

  const filtered = filterRowsByQuery(rows, search, haystack);
  const sorted = sortRows(filtered, sort, {
    sortIndex: (row) => row.sortIndex ?? 0,
    departureCountry: (row) => row.departureCountry ?? "",
    entryCountry: (row) => row.entryCountry ?? "",
    borderName: (row) => row.borderName ?? "",
    date: (row) => (row.date ? dateSortKey(row.date) : "99999999999999"),
    entryTime: (row) => row.entryTime || "99:99",
    totalCrossingTime: (row) => crossingTimeMinutes(row.totalCrossingTime ?? ""),
  });

  async function loadRows(quiet = false) {
    if (!quiet) {
      setStatus("loading");
      setMessage(null);
    }
    try {
      const response = await fetch("/api/passat-border-crossings");
      const body = (await response.json()) as {
        ok: boolean;
        data?: PassatBorderCrossingRecord[];
        error?: string;
      };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to load border crossings");
      }
      setRows(body.data ?? []);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to load");
    }
  }

  useEffect(() => {
    void loadRows();
  }, []);

  function updateField<K extends keyof CrossingFormState>(
    key: K,
    value: CrossingFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateRow<K extends keyof CrossingFormState>(
    key: K,
    value: CrossingFormState[K],
  ) {
    setRowDraft((current) =>
      current ? { ...current, [key]: value } : current,
    );
  }

  function startEdit(row: PassatBorderCrossingRecord) {
    setEditingId(row._id);
    setRowDraft(toFormState(row));
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setRowDraft(null);
  }

  async function saveRecord(payload: CrossingFormState, id?: string) {
    const parsed = passatBorderCrossingWriteSchema.safeParse(payload);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Invalid border crossing");
      return false;
    }

    setSaving(true);
    try {
      const response = await fetch(
        id
          ? `/api/passat-border-crossings/${id}`
          : "/api/passat-border-crossings",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );
      const body = (await response.json()) as {
        ok: boolean;
        data?: PassatBorderCrossingRecord;
        error?: string;
      };
      if (!response.ok || !body.ok || !body.data) {
        throw new Error(body.error ?? "Save failed");
      }
      const saved = body.data;
      if (id) {
        cancelEdit();
        setRows((current) =>
          current.map((row) => (row._id === id ? saved : row)),
        );
      } else {
        setForm(EMPTY_FORM);
        setRows((current) => [...current, saved]);
      }
      setMessage(id ? "Border crossing updated." : "Border crossing added.");
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
    if (!window.confirm("Delete this border crossing?")) return;
    setMessage(null);
    try {
      const response = await fetch(`/api/passat-border-crossings/${id}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Delete failed");
      }
      if (editingId === id) cancelEdit();
      setRows((current) => current.filter((row) => row._id !== id));
      setMessage("Border crossing removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    }
  }

  async function seedRows(force = false) {
    if (
      force &&
      !window.confirm(
        "Replace all existing border crossings with the seed list?",
      )
    ) {
      return;
    }
    setMessage(null);
    setSaving(true);
    try {
      const response = await fetch("/api/passat-border-crossings/seed", {
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
          "Border crossings already exist. Use replace seed to overwrite them.",
        );
      } else {
        setMessage(
          `Imported ${body.data.inserted.toLocaleString("en-GB")} border crossings.`,
        );
        await loadRows(true);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Seed failed");
    } finally {
      setSaving(false);
    }
  }

  const headerSort = (key: CrossingSortKey) => {
    if (editingId) cancelEdit();
    setSort((current) => nextSortState(current, key));
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">
          Passat border crossings
        </h1>
        <p className="mt-2 text-sm text-muted">
          Times from the Passat road trip. Crossing time is hours:minutes (e.g.
          1:39). Date and entry time are optional.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-3 border border-border bg-surface/60 p-4 sm:grid-cols-2 lg:grid-cols-3"
        data-testid="passat-border-crossing-form"
      >
        <h2 className="font-display text-xl text-foreground sm:col-span-2 lg:col-span-3">
          Add border crossing
        </h2>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Departure country
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.departureCountry}
            onChange={(event) =>
              updateField("departureCountry", event.target.value)
            }
            required
            data-testid="passat-border-departure"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Entry country
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.entryCountry}
            onChange={(event) =>
              updateField("entryCountry", event.target.value)
            }
            required
            data-testid="passat-border-entry"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Border name
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.borderName}
            onChange={(event) => updateField("borderName", event.target.value)}
            data-testid="passat-border-name"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Date
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.date}
            onChange={(event) => updateField("date", event.target.value)}
            placeholder="01/06/2025"
            data-testid="passat-border-date"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Entry time
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.entryTime}
            onChange={(event) => updateField("entryTime", event.target.value)}
            placeholder="14:30"
            data-testid="passat-border-entry-time"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Total crossing time
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.totalCrossingTime}
            onChange={(event) =>
              updateField("totalCrossingTime", event.target.value)
            }
            placeholder="1:39"
            required
            data-testid="passat-border-crossing-time"
          />
        </label>

        <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            data-testid="passat-border-save"
          >
            {saving ? "Saving…" : "Add crossing"}
          </button>
        </div>
      </form>

      {message ? (
        <p className="text-sm text-muted" data-testid="passat-border-message">
          {message}
        </p>
      ) : null}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-foreground">
            Crossings ({sorted.length}
            {search.trim() ? ` of ${rows.length}` : ""})
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <AdminSearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search country, border, or date"
              testId="passat-border-search"
            />
            <button
              type="button"
              onClick={() => void seedRows(false)}
              disabled={saving}
              className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline disabled:opacity-60"
            >
              Import seed
            </button>
            <button
              type="button"
              onClick={() => void seedRows(true)}
              disabled={saving}
              className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline disabled:opacity-60"
            >
              Replace with seed
            </button>
            <button
              type="button"
              onClick={() => void loadRows()}
              className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
            >
              Refresh
            </button>
          </div>
        </div>

        {status === "loading" ? (
          <p className="text-sm text-muted">Loading border crossings…</p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm text-red-300">{message}</p>
        ) : null}

        {status === "ready" ? (
          <div className="overflow-x-auto border border-border">
            <table
              className="min-w-[52rem] text-left text-sm"
              data-testid="passat-border-crossings-table"
            >
              <thead className="bg-surface text-muted">
                <tr>
                  <SortableHeader
                    label="Departure country"
                    columnKey="departureCountry"
                    activeKey={sort.key}
                    direction={sort.direction}
                    onSort={headerSort}
                  />
                  <SortableHeader
                    label="Entry country"
                    columnKey="entryCountry"
                    activeKey={sort.key}
                    direction={sort.direction}
                    onSort={headerSort}
                  />
                  <SortableHeader
                    label="Border name"
                    columnKey="borderName"
                    activeKey={sort.key}
                    direction={sort.direction}
                    onSort={headerSort}
                  />
                  <SortableHeader
                    label="Date"
                    columnKey="date"
                    activeKey={sort.key}
                    direction={sort.direction}
                    onSort={headerSort}
                  />
                  <SortableHeader
                    label="Entry time"
                    columnKey="entryTime"
                    activeKey={sort.key}
                    direction={sort.direction}
                    onSort={headerSort}
                  />
                  <SortableHeader
                    label="Total crossing time"
                    columnKey="totalCrossingTime"
                    activeKey={sort.key}
                    direction={sort.direction}
                    onSort={headerSort}
                  />
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => {
                  const editing = editingId === row._id ? rowDraft : null;
                  if (!editing) {
                    return (
                      <tr
                        key={row._id}
                        className="border-t border-border text-foreground"
                      >
                        <td className="px-3 py-2 align-top">
                          {row.departureCountry}
                        </td>
                        <td className="px-3 py-2 align-top">
                          {row.entryCountry}
                        </td>
                        <td className="px-3 py-2 align-top text-muted">
                          {dash(row.borderName ?? "")}
                        </td>
                        <td className="px-3 py-2 align-top whitespace-nowrap">
                          {dash(row.date ?? "")}
                        </td>
                        <td className="px-3 py-2 align-top tabular-nums">
                          {dash(row.entryTime ?? "")}
                        </td>
                        <td className="px-3 py-2 align-top tabular-nums">
                          {row.totalCrossingTime}
                        </td>
                        <td className="px-3 py-2 align-top whitespace-nowrap">
                          <button
                            type="button"
                            className="mr-3 text-accent hover:underline"
                            onClick={() => startEdit(row)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-red-300 hover:underline"
                            onClick={() => void onDelete(row._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={row._id}
                      className="border-t border-border bg-surface/70 text-foreground"
                      data-testid="passat-border-inline-row"
                    >
                      <td className="px-3 py-2 align-top">
                        <AdminInlineInput
                          value={editing.departureCountry}
                          onChange={(event) =>
                            updateRow("departureCountry", event.target.value)
                          }
                          onSave={() => void saveRow()}
                          onCancel={cancelEdit}
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <AdminInlineInput
                          value={editing.entryCountry}
                          onChange={(event) =>
                            updateRow("entryCountry", event.target.value)
                          }
                          onSave={() => void saveRow()}
                          onCancel={cancelEdit}
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <AdminInlineInput
                          value={editing.borderName}
                          onChange={(event) =>
                            updateRow("borderName", event.target.value)
                          }
                          onSave={() => void saveRow()}
                          onCancel={cancelEdit}
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
                          placeholder="01/06/2025"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <AdminInlineInput
                          value={editing.entryTime}
                          onChange={(event) =>
                            updateRow("entryTime", event.target.value)
                          }
                          onSave={() => void saveRow()}
                          onCancel={cancelEdit}
                          placeholder="14:30"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <AdminInlineInput
                          value={editing.totalCrossingTime}
                          onChange={(event) =>
                            updateRow("totalCrossingTime", event.target.value)
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
                          onClick={() => void onDelete(row._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {sorted.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted">
                No border crossings yet. Import the seed list or add one above.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
