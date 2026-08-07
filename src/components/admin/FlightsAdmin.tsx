"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  dateSortKey,
  nextSortState,
  sortRows,
  type SortState,
} from "@/lib/admin/table-sort";
import { SortableHeader } from "@/components/admin/SortableHeader";
import {
  flightWriteSchema,
  type FlightRecord,
  type FlightWriteInput,
} from "@/lib/validations/flight-write";

type FlightSortKey = "date" | "route";

const EMPTY_FORM: FlightWriteInput = {
  departure: "",
  arrival: "",
  connecting: "",
  date: "",
  departure_coordinates: "",
  connecting_coordinates: "",
  arrival_coordinates: "",
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
  };
}

function flightRouteLabel(flight: FlightRecord): string {
  return `${flight.departure}${flight.connecting ? ` → ${flight.connecting}` : ""} → ${flight.arrival}`;
}

export function FlightsAdmin() {
  const [flights, setFlights] = useState<FlightRecord[]>([]);
  const [form, setForm] = useState<FlightWriteInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState<SortState<FlightSortKey> | null>(null);

  const sortedFlights = sortRows(flights, sort, {
    date: (flight) => dateSortKey(flight.date ?? ""),
    route: (flight) => flightRouteLabel(flight),
  });

  async function loadFlights() {
    setStatus("loading");
    setMessage(null);
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

  function startEdit(flight: FlightRecord) {
    setEditingId(flight._id);
    setForm(toFormValues(flight));
    setMessage(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const parsed = flightWriteSchema.safeParse(form);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Invalid flight");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editingId ? `/api/flights/${editingId}` : "/api/flights",
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
      await loadFlights();
      setMessage(editingId ? "Flight updated." : "Flight added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
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
      if (editingId === id) resetForm();
      await loadFlights();
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
          {editingId ? "Update flight" : "Add flight"}
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

        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            data-testid="flight-save"
          >
            {saving ? "Saving…" : editingId ? "Update flight" : "Add flight"}
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
        <p className="text-sm text-muted" data-testid="flight-admin-message">
          {message}
        </p>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-foreground">
            Existing flights ({flights.length})
          </h2>
          <button
            type="button"
            onClick={() => void loadFlights()}
            className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            Refresh
          </button>
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
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedFlights.map((flight) => (
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
                ))}
              </tbody>
            </table>
            {sortedFlights.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted">No flights yet.</p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
