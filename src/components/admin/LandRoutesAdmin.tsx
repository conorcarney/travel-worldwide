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
  SURFACE_ROUTE_TYPES,
  surfaceRouteWriteSchema,
  type SurfaceRouteRecord,
  type SurfaceRouteWriteInput,
} from "@/lib/validations/surface-route-write";

type LandRouteSortKey = "type" | "date" | "route";

/** Form state keeps coordinate fields as strings while typing. */
type SurfaceRouteFormState = {
  departure: string;
  arrival: string;
  departure_longitude: string;
  departure_latitude: string;
  arrival_longitude: string;
  arrival_latitude: string;
  type: SurfaceRouteWriteInput["type"];
  date: string;
};

const EMPTY_FORM_STATE: SurfaceRouteFormState = {
  departure: "",
  arrival: "",
  departure_longitude: "",
  departure_latitude: "",
  arrival_longitude: "",
  arrival_latitude: "",
  type: "Train",
  date: "",
};

function toFormState(route: SurfaceRouteRecord): SurfaceRouteFormState {
  return {
    departure: route.departure ?? "",
    arrival: route.arrival ?? "",
    departure_longitude: String(route.departure_longitude ?? ""),
    departure_latitude: String(route.departure_latitude ?? ""),
    arrival_longitude: String(route.arrival_longitude ?? ""),
    arrival_latitude: String(route.arrival_latitude ?? ""),
    type: route.type,
    date: route.date ?? "",
  };
}

function formStateToPayload(form: SurfaceRouteFormState) {
  return {
    departure: form.departure,
    arrival: form.arrival,
    departure_longitude: form.departure_longitude,
    departure_latitude: form.departure_latitude,
    arrival_longitude: form.arrival_longitude,
    arrival_latitude: form.arrival_latitude,
    type: form.type,
    date: form.date,
  };
}

function landRouteLabel(route: SurfaceRouteRecord): string {
  return `${route.departure} → ${route.arrival}`;
}

export function LandRoutesAdmin() {
  const [routes, setRoutes] = useState<SurfaceRouteRecord[]>([]);
  const [form, setForm] = useState<SurfaceRouteFormState>(EMPTY_FORM_STATE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState<SortState<LandRouteSortKey> | null>(null);

  const sortedRoutes = sortRows(routes, sort, {
    type: (route) => route.type,
    date: (route) => dateSortKey(route.date ?? ""),
    route: (route) => landRouteLabel(route),
  });

  async function loadRoutes() {
    setStatus("loading");
    setMessage(null);
    try {
      const response = await fetch("/api/buses-trains-ferries");
      const body = (await response.json()) as {
        ok: boolean;
        data?: SurfaceRouteRecord[];
        error?: string;
      };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to load routes");
      }
      setRoutes(body.data ?? []);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to load");
    }
  }

  useEffect(() => {
    void loadRoutes();
  }, []);

  function updateField<K extends keyof SurfaceRouteFormState>(
    key: K,
    value: SurfaceRouteFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startEdit(route: SurfaceRouteRecord) {
    setEditingId(route._id);
    setForm(toFormState(route));
    setMessage(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM_STATE);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const parsed = surfaceRouteWriteSchema.safeParse(formStateToPayload(form));
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Invalid route");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editingId
          ? `/api/buses-trains-ferries/${editingId}`
          : "/api/buses-trains-ferries",
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
      await loadRoutes();
      setMessage(editingId ? "Route updated." : "Route added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this route?")) return;
    setMessage(null);
    try {
      const response = await fetch(`/api/buses-trains-ferries/${id}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Delete failed");
      }
      if (editingId === id) resetForm();
      await loadRoutes();
      setMessage("Route deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">
          Land routes admin
        </h1>
        <p className="mt-2 text-sm text-muted">
          Add, edit, or delete bus, train, ferry, and car routes. Coordinates
          are decimal latitude/longitude numbers.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 border border-border bg-surface/60 p-4 sm:grid-cols-2"
        data-testid="land-route-form"
      >
        <h2 className="font-display text-xl text-foreground sm:col-span-2">
          {editingId ? "Update route" : "Add route"}
        </h2>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Type
          <select
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.type}
            onChange={(event) =>
              updateField(
                "type",
                event.target.value as SurfaceRouteWriteInput["type"],
              )
            }
            data-testid="land-route-type"
          >
            {SURFACE_ROUTE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Date
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.date}
            onChange={(event) => updateField("date", event.target.value)}
            placeholder="27/02/2019"
            data-testid="land-route-date"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Departure
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.departure}
            onChange={(event) => updateField("departure", event.target.value)}
            data-testid="land-route-departure"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Arrival
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.arrival}
            onChange={(event) => updateField("arrival", event.target.value)}
            data-testid="land-route-arrival"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Departure latitude
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.departure_latitude}
            onChange={(event) =>
              updateField("departure_latitude", event.target.value)
            }
            placeholder="53.21588495"
            data-testid="land-route-departure-latitude"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Departure longitude
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.departure_longitude}
            onChange={(event) =>
              updateField("departure_longitude", event.target.value)
            }
            placeholder="6.56982422"
            data-testid="land-route-departure-longitude"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Arrival latitude
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.arrival_latitude}
            onChange={(event) =>
              updateField("arrival_latitude", event.target.value)
            }
            placeholder="48.14087441"
            data-testid="land-route-arrival-latitude"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Arrival longitude
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.arrival_longitude}
            onChange={(event) =>
              updateField("arrival_longitude", event.target.value)
            }
            placeholder="11.57409668"
            data-testid="land-route-arrival-longitude"
            required
          />
        </label>

        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            data-testid="land-route-save"
          >
            {saving ? "Saving…" : editingId ? "Update route" : "Add route"}
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
        <p className="text-sm text-muted" data-testid="land-route-admin-message">
          {message}
        </p>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-foreground">
            Existing routes ({routes.length})
          </h2>
          <button
            type="button"
            onClick={() => void loadRoutes()}
            className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            Refresh
          </button>
        </div>

        {status === "loading" ? (
          <p className="text-sm text-muted">Loading routes…</p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm text-red-300">{message}</p>
        ) : null}

        {status === "ready" ? (
          <div className="overflow-x-auto border border-border">
            <table
              className="min-w-full text-left text-sm"
              data-testid="land-routes-table"
            >
              <thead className="bg-surface text-muted">
                <tr>
                  <SortableHeader
                    label="Type"
                    columnKey="type"
                    activeKey={sort?.key ?? null}
                    direction={sort?.direction ?? null}
                    onSort={(key) => setSort((current) => nextSortState(current, key))}
                  />
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
                {sortedRoutes.map((route) => (
                  <tr
                    key={route._id}
                    className="border-t border-border text-foreground"
                  >
                    <td className="px-3 py-2 align-top whitespace-nowrap">
                      {route.type}
                    </td>
                    <td className="px-3 py-2 align-top whitespace-nowrap">
                      {route.date}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {landRouteLabel(route)}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-muted">
                      {route.departure_latitude}, {route.departure_longitude}
                      {" → "}
                      {route.arrival_latitude}, {route.arrival_longitude}
                    </td>
                    <td className="px-3 py-2 align-top whitespace-nowrap">
                      <button
                        type="button"
                        className="mr-3 text-accent hover:underline"
                        onClick={() => startEdit(route)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-red-300 hover:underline"
                        onClick={() => void onDelete(route._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedRoutes.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted">No routes yet.</p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
