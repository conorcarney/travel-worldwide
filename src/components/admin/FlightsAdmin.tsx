"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  dateSortKey,
  nextSortState,
  sortRows,
  type SortState,
} from "@/lib/admin/table-sort";
import {
  AdminInlineField,
  AdminInlineInput,
} from "@/components/admin/AdminInlineField";
import { AdminMediaField, type AdminMediaFieldHandle } from "@/components/admin/AdminMediaField";
import { AdminSearchBar } from "@/components/admin/AdminSearchBar";
import { SortableHeader } from "@/components/admin/SortableHeader";
import { filterRowsByQuery } from "@/lib/admin/search";
import { mediaCountLabel } from "@/lib/map/trip-media";
import {
  flightWriteSchema,
  type FlightRecord,
  type FlightWriteInput,
} from "@/lib/validations/flight-write";

type FlightSortKey = "date" | "route" | "tags";

const EMPTY_FORM: FlightWriteInput = {
  departure: "",
  arrival: "",
  connecting: "",
  date: "",
  departure_coordinates: "",
  connecting_coordinates: "",
  arrival_coordinates: "",
  tags: "",
  media: "",
};

function toFormValues(flight: FlightRecord): FlightWriteInput {
  return {
    departure: flight.departure ?? "",
    arrival: flight.arrival ?? "",
    connecting: flight.connecting ?? "",
    date: flight.date ?? "",
    departure_coordinates: flight.departure_coordinates ?? "",
    connecting_coordinates: flight.connecting_coordinates ?? "",
    arrival_coordinates: flight.arrival_coordinates ?? "",
    tags: flight.tags ?? "",
    media: flight.media ?? "",
  };
}

function flightRouteLabel(flight: FlightRecord): string {
  return `${flight.departure}${flight.connecting ? ` → ${flight.connecting}` : ""} → ${flight.arrival}`;
}

function flightSearchHaystack(flight: FlightRecord): string {
  return [
    flight.departure,
    flight.connecting,
    flight.arrival,
    flight.date,
    flight.tags,
    flight.media,
  ].join(" ");
}

export function FlightsAdmin() {
  const [flights, setFlights] = useState<FlightRecord[]>([]);
  const [form, setForm] = useState<FlightWriteInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<FlightWriteInput | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState<SortState<FlightSortKey> | null>(null);
  const [search, setSearch] = useState("");
  const addMediaRef = useRef<AdminMediaFieldHandle | null>(null);
  const rowMediaRef = useRef<AdminMediaFieldHandle | null>(null);

  const filteredFlights = filterRowsByQuery(
    flights,
    search,
    flightSearchHaystack,
  );
  const sortedFlights = sortRows(filteredFlights, sort, {
    date: (flight) => dateSortKey(flight.date ?? ""),
    route: (flight) => flightRouteLabel(flight),
    tags: (flight) => flight.tags ?? "",
  });

  async function loadFlights(quiet = false) {
    if (!quiet) {
      setStatus("loading");
      setMessage(null);
    }
    try {
      const response = await fetch("/api/flights");
      const body = (await response.json()) as {
        ok: boolean;
        data?: FlightRecord[];
        error?: string;
      };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to load flights");
      }
      setFlights(body.data ?? []);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to load");
    }
  }

  useEffect(() => {
    void loadFlights();
  }, []);

  function updateField<K extends keyof FlightWriteInput>(
    key: K,
    value: FlightWriteInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateRow<K extends keyof FlightWriteInput>(
    key: K,
    value: FlightWriteInput[K],
  ) {
    setRowDraft((current) =>
      current ? { ...current, [key]: value } : current,
    );
  }

  function startEdit(flight: FlightRecord) {
    setEditingId(flight._id);
    setRowDraft(toFormValues(flight));
    setMessage(null);
  }

  function cancelEdit() {
    rowMediaRef.current?.clearPending();
    setEditingId(null);
    setRowDraft(null);
  }

  function changeSearch(value: string) {
    if (editingId) cancelEdit();
    setSearch(value);
  }

  function resetForm() {
    addMediaRef.current?.clearPending();
    setForm(EMPTY_FORM);
  }

  async function saveRecord(payload: FlightWriteInput, id?: string) {
    const parsed = flightWriteSchema.safeParse(payload);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Invalid flight");
      return false;
    }

    setSaving(true);
    try {
      const mediaHandle = id ? rowMediaRef.current : addMediaRef.current;
      const media =
        (await mediaHandle?.flushUploads(payload.date)) ?? parsed.data.media;
      const response = await fetch(id ? `/api/flights/${id}` : "/api/flights", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, media }),
      });
      const body = (await response.json()) as {
        ok: boolean;
        data?: FlightRecord;
        error?: string;
      };
      if (!response.ok || !body.ok || !body.data) {
        throw new Error(body.error ?? "Save failed");
      }
      const saved = body.data;
      if (id) {
        cancelEdit();
        setFlights((current) =>
          current.map((row) => (row._id === id ? saved : row)),
        );
      } else {
        resetForm();
        setFlights((current) => [saved, ...current]);
      }
      setMessage(id ? "Flight updated." : "Flight added.");
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
    if (!window.confirm("Delete this flight?")) return;
    setMessage(null);
    try {
      const response = await fetch(`/api/flights/${id}`, { method: "DELETE" });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Delete failed");
      }
      if (editingId === id) cancelEdit();
      setFlights((current) => current.filter((row) => row._id !== id));
      setMessage("Flight deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Flights admin</h1>
        <p className="mt-2 text-sm text-muted">
          Add, edit, or delete flight routes. Coordinates use{" "}
          <code className="text-foreground">lng, lat</code> (e.g.{" "}
          <code className="text-foreground">-6.2603, 53.3498</code>).
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 border border-border bg-surface/60 p-4 sm:grid-cols-2"
        data-testid="flight-form"
      >
        <h2 className="font-display text-xl text-foreground sm:col-span-2">
          Add flight
        </h2>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Departure
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.departure}
            onChange={(event) => updateField("departure", event.target.value)}
            data-testid="flight-departure"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Arrival
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.arrival}
            onChange={(event) => updateField("arrival", event.target.value)}
            data-testid="flight-arrival"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Connecting (optional)
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.connecting}
            onChange={(event) => updateField("connecting", event.target.value)}
            data-testid="flight-connecting"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Date
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.date}
            onChange={(event) => updateField("date", event.target.value)}
            placeholder="19/01/2023 or 2/2020"
            data-testid="flight-date"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Departure coordinates
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.departure_coordinates}
            onChange={(event) =>
              updateField("departure_coordinates", event.target.value)
            }
            placeholder="-6.2603, 53.3498"
            data-testid="flight-departure-coordinates"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Arrival coordinates
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.arrival_coordinates}
            onChange={(event) =>
              updateField("arrival_coordinates", event.target.value)
            }
            placeholder="2.1115, 49.4545"
            data-testid="flight-arrival-coordinates"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2">
          Connecting coordinates (optional)
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.connecting_coordinates}
            onChange={(event) =>
              updateField("connecting_coordinates", event.target.value)
            }
            placeholder="Leave blank if no connection"
            data-testid="flight-connecting-coordinates"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2">
          Tags (optional)
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.tags}
            onChange={(event) => updateField("tags", event.target.value)}
            placeholder="Work, Family"
            data-testid="flight-tags"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm text-muted sm:col-span-2">
          Photos or videos (optional)
          <AdminMediaField
            ref={addMediaRef}
            value={form.media}
            onChange={(media) => updateField("media", media)}
            tripDate={form.date}
            disabled={saving}
            testId="flight-media"
          />
        </div>

        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            data-testid="flight-save"
          >
            {saving ? "Saving…" : "Add flight"}
          </button>
        </div>
      </form>

      {message ? (
        <p className="text-sm text-muted" data-testid="flight-admin-message">
          {message}
        </p>
      ) : null}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-foreground">
            Existing flights (
            {search.trim()
              ? `${filteredFlights.length} of ${flights.length}`
              : flights.length}
            )
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <AdminSearchBar
              value={search}
              onChange={changeSearch}
              placeholder="Search city, date, or tags"
              testId="flights-search"
            />
            <button
              type="button"
              onClick={() => void loadFlights()}
              className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
            >
              Refresh
            </button>
          </div>
        </div>

        {status === "loading" ? (
          <p className="text-sm text-muted">Loading flights…</p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm text-red-300">{message}</p>
        ) : null}

        {status === "ready" ? (
          <div className="overflow-x-auto border border-border">
            <table className="min-w-full text-left text-sm" data-testid="flights-table">
              <thead className="bg-surface text-muted">
                <tr>
                  <SortableHeader
                    label="Date"
                    columnKey="date"
                    activeKey={sort?.key ?? null}
                    direction={sort?.direction ?? null}
                    onSort={(key) => setSort((current) => nextSortState(current, key))}
                  />
                  <SortableHeader
                    label="Route"
                    columnKey="route"
                    activeKey={sort?.key ?? null}
                    direction={sort?.direction ?? null}
                    onSort={(key) => setSort((current) => nextSortState(current, key))}
                  />
                  <th className="px-3 py-2 font-medium">Coordinates</th>
                    <SortableHeader
                    label="Tags"
                    columnKey="tags"
                    activeKey={sort?.key ?? null}
                    direction={sort?.direction ?? null}
                    onSort={(key) => setSort((current) => nextSortState(current, key))}
                  />
                  <th className="px-3 py-2 font-medium">Media</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedFlights.map((flight) => {
                  const editing = editingId === flight._id ? rowDraft : null;
                  if (!editing) {
                    return (
                      <tr
                        key={flight._id}
                        className="border-t border-border text-foreground"
                      >
                        <td className="px-3 py-2 align-top whitespace-nowrap">
                          {flight.date}
                        </td>
                        <td className="px-3 py-2 align-top">
                          {flightRouteLabel(flight)}
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-muted">
                          {flight.departure_coordinates}
                          {flight.connecting_coordinates
                            ? ` · ${flight.connecting_coordinates}`
                            : ""}
                          {" · "}
                          {flight.arrival_coordinates}
                        </td>
                        <td className="px-3 py-2 align-top">
                          {flight.tags || "—"}
                        </td>
                        <td className="px-3 py-2 align-top text-muted">
                          {mediaCountLabel(flight.media)}
                        </td>
                        <td className="px-3 py-2 align-top whitespace-nowrap">
                          <button
                            type="button"
                            className="mr-3 text-accent hover:underline"
                            onClick={() => startEdit(flight)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-red-300 hover:underline"
                            onClick={() => void onDelete(flight._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={flight._id}
                      className="border-t border-border bg-surface/70 text-foreground"
                      data-testid="flight-inline-row"
                    >
                      <td className="px-3 py-2 align-top">
                        <AdminInlineInput
                          value={editing.date}
                          onChange={(event) =>
                            updateRow("date", event.target.value)
                          }
                          onSave={() => void saveRow()}
                          onCancel={cancelEdit}
                          data-testid="flight-inline-date"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-col gap-1">
                          <AdminInlineField label="From">
                            <AdminInlineInput
                              value={editing.departure}
                              onChange={(event) =>
                                updateRow("departure", event.target.value)
                              }
                              onSave={() => void saveRow()}
                              onCancel={cancelEdit}
                              data-testid="flight-inline-departure"
                            />
                          </AdminInlineField>
                          <AdminInlineField label="Connecting">
                            <AdminInlineInput
                              value={editing.connecting}
                              onChange={(event) =>
                                updateRow("connecting", event.target.value)
                              }
                              onSave={() => void saveRow()}
                              onCancel={cancelEdit}
                              data-testid="flight-inline-connecting"
                            />
                          </AdminInlineField>
                          <AdminInlineField label="To">
                            <AdminInlineInput
                              value={editing.arrival}
                              onChange={(event) =>
                                updateRow("arrival", event.target.value)
                              }
                              onSave={() => void saveRow()}
                              onCancel={cancelEdit}
                              data-testid="flight-inline-arrival"
                            />
                          </AdminInlineField>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-col gap-1">
                          <AdminInlineField label="From lng, lat">
                            <AdminInlineInput
                              value={editing.departure_coordinates}
                              onChange={(event) =>
                                updateRow(
                                  "departure_coordinates",
                                  event.target.value,
                                )
                              }
                              onSave={() => void saveRow()}
                              onCancel={cancelEdit}
                              data-testid="flight-inline-departure-coordinates"
                            />
                          </AdminInlineField>
                          <AdminInlineField label="Connecting lng, lat">
                            <AdminInlineInput
                              value={editing.connecting_coordinates}
                              onChange={(event) =>
                                updateRow(
                                  "connecting_coordinates",
                                  event.target.value,
                                )
                              }
                              onSave={() => void saveRow()}
                              onCancel={cancelEdit}
                              data-testid="flight-inline-connecting-coordinates"
                            />
                          </AdminInlineField>
                          <AdminInlineField label="To lng, lat">
                            <AdminInlineInput
                              value={editing.arrival_coordinates}
                              onChange={(event) =>
                                updateRow(
                                  "arrival_coordinates",
                                  event.target.value,
                                )
                              }
                              onSave={() => void saveRow()}
                              onCancel={cancelEdit}
                              data-testid="flight-inline-arrival-coordinates"
                            />
                          </AdminInlineField>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <AdminInlineInput
                          value={editing.tags}
                          onChange={(event) =>
                            updateRow("tags", event.target.value)
                          }
                          onSave={() => void saveRow()}
                          onCancel={cancelEdit}
                          data-testid="flight-inline-tags"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <AdminMediaField
                          ref={rowMediaRef}
                          compact
                          value={editing.media}
                          onChange={(media) => updateRow("media", media)}
                          tripDate={editing.date}
                          disabled={saving}
                          testId="flight-inline-media"
                        />
                      </td>
                      <td className="px-3 py-2 align-top whitespace-nowrap">
                        <button
                          type="button"
                          className="mr-3 text-accent hover:underline disabled:opacity-60"
                          disabled={saving}
                          onClick={() => void saveRow()}
                          data-testid="flight-inline-save"
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          className="mr-3 text-foreground hover:underline"
                          onClick={cancelEdit}
                          data-testid="flight-inline-cancel"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="text-red-300 hover:underline"
                          onClick={() => void onDelete(flight._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {sortedFlights.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted">
                {search.trim()
                  ? "No flights match your search."
                  : "No flights yet."}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
