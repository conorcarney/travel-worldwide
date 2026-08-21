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
  AdminInlineSelect,
} from "@/components/admin/AdminInlineField";
import { AdminMediaField, type AdminMediaFieldHandle } from "@/components/admin/AdminMediaField";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearchBar } from "@/components/admin/AdminSearchBar";
import { SortableHeader } from "@/components/admin/SortableHeader";
import { paginateRows } from "@/lib/admin/pagination";
import { filterRowsByQuery } from "@/lib/admin/search";
import { mediaCountLabel } from "@/lib/map/trip-media";
import {
  SURFACE_ROUTE_TYPES,
  surfaceRouteWriteSchema,
  type SurfaceRouteRecord,
  type SurfaceRouteWriteInput,
} from "@/lib/validations/surface-route-write";

type LandRouteSortKey = "type" | "date" | "route" | "tags";

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
  tags: string;
  media: string;
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
  tags: "",
  media: "",
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
    tags: route.tags ?? "",
    media: route.media ?? "",
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
    tags: form.tags,
    media: form.media,
  };
}

function landRouteLabel(route: SurfaceRouteRecord): string {
  return `${route.departure} → ${route.arrival}`;
}

function landRouteSearchHaystack(route: SurfaceRouteRecord): string {
  return [
    route.type,
    route.departure,
    route.arrival,
    route.date,
    route.tags,
    route.media,
  ].join(" ");
}

export function LandRoutesAdmin() {
  const [routes, setRoutes] = useState<SurfaceRouteRecord[]>([]);
  const [form, setForm] = useState<SurfaceRouteFormState>(EMPTY_FORM_STATE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<SurfaceRouteFormState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState<SortState<LandRouteSortKey> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const addMediaRef = useRef<AdminMediaFieldHandle | null>(null);
  const rowMediaRef = useRef<AdminMediaFieldHandle | null>(null);

  const filteredRoutes = filterRowsByQuery(
    routes,
    search,
    landRouteSearchHaystack,
  );
  const sortedRoutes = sortRows(filteredRoutes, sort, {
    type: (route) => route.type,
    date: (route) => dateSortKey(route.date ?? ""),
    route: (route) => landRouteLabel(route),
    tags: (route) => route.tags ?? "",
  });
  const pagedRoutes = paginateRows(sortedRoutes, page);

  async function loadRoutes(quiet = false) {
    if (!quiet) {
      setStatus("loading");
      setMessage(null);
    }
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

  function updateRow<K extends keyof SurfaceRouteFormState>(
    key: K,
    value: SurfaceRouteFormState[K],
  ) {
    setRowDraft((current) =>
      current ? { ...current, [key]: value } : current,
    );
  }

  function startEdit(route: SurfaceRouteRecord) {
    setEditingId(route._id);
    setRowDraft(toFormState(route));
    setMessage(null);
  }

  function cancelEdit() {
    rowMediaRef.current?.clearPending();
    setEditingId(null);
    setRowDraft(null);
  }

  function goToPage(next: number) {
    if (editingId) cancelEdit();
    setPage(next);
  }

  function changeSort(key: LandRouteSortKey) {
    if (editingId) cancelEdit();
    setSort((current) => nextSortState(current, key));
    setPage(1);
  }

  function changeSearch(value: string) {
    if (editingId) cancelEdit();
    setSearch(value);
    setPage(1);
  }

  function resetForm() {
    addMediaRef.current?.clearPending();
    setForm(EMPTY_FORM_STATE);
  }

  async function saveRecord(payload: SurfaceRouteFormState, id?: string) {
    const parsed = surfaceRouteWriteSchema.safeParse(formStateToPayload(payload));
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Invalid route");
      return false;
    }

    setSaving(true);
    try {
      const mediaHandle = id ? rowMediaRef.current : addMediaRef.current;
      const media =
        (await mediaHandle?.flushUploads(payload.date)) ?? parsed.data.media;
      const response = await fetch(
        id
          ? `/api/buses-trains-ferries/${id}`
          : "/api/buses-trains-ferries",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...parsed.data, media }),
        },
      );
      const body = (await response.json()) as {
        ok: boolean;
        data?: SurfaceRouteRecord;
        error?: string;
      };
      if (!response.ok || !body.ok || !body.data) {
        throw new Error(body.error ?? "Save failed");
      }
      const saved = body.data;
      if (id) {
        cancelEdit();
        setRoutes((current) =>
          current.map((row) => (row._id === id ? saved : row)),
        );
      } else {
        resetForm();
        setRoutes((current) => [saved, ...current]);
        setPage(1);
      }
      setMessage(id ? "Route updated." : "Route added.");
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
      if (editingId === id) cancelEdit();
      setRoutes((current) => current.filter((row) => row._id !== id));
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
          Add route
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

        <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2">
          Tags (optional)
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.tags}
            onChange={(event) => updateField("tags", event.target.value)}
            placeholder="Work, Family"
            data-testid="land-route-tags"
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
            testId="land-route-media"
          />
        </div>

        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            data-testid="land-route-save"
          >
            {saving ? "Saving…" : "Add route"}
          </button>
        </div>
      </form>

      {message ? (
        <p className="text-sm text-muted" data-testid="land-route-admin-message">
          {message}
        </p>
      ) : null}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-foreground">
            Existing routes (
            {search.trim()
              ? `${filteredRoutes.length} of ${routes.length}`
              : routes.length}
            )
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <AdminSearchBar
              value={search}
              onChange={changeSearch}
              placeholder="Search city, date, type, or tags"
              testId="land-routes-search"
            />
            <button
              type="button"
              onClick={() => void loadRoutes()}
              className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
            >
              Refresh
            </button>
          </div>
        </div>

        {status === "loading" ? (
          <p className="text-sm text-muted">Loading routes…</p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm text-red-300">{message}</p>
        ) : null}

        {status === "ready" ? (
          <div className="overflow-x-auto border border-border">
            <AdminPagination
              edge="top"
              testId="admin-pagination-top"
              page={pagedRoutes.page}
              totalPages={pagedRoutes.totalPages}
              start={pagedRoutes.start}
              end={pagedRoutes.end}
              total={pagedRoutes.total}
              onPageChange={goToPage}
            />
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
                    onSort={changeSort}
                  />
                  <SortableHeader
                    label="Date"
                    columnKey="date"
                    activeKey={sort?.key ?? null}
                    direction={sort?.direction ?? null}
                    onSort={changeSort}
                  />
                  <SortableHeader
                    label="Route"
                    columnKey="route"
                    activeKey={sort?.key ?? null}
                    direction={sort?.direction ?? null}
                    onSort={changeSort}
                  />
                  <th className="px-3 py-2 font-medium">Coordinates</th>
                    <SortableHeader
                    label="Tags"
                    columnKey="tags"
                    activeKey={sort?.key ?? null}
                    direction={sort?.direction ?? null}
                    onSort={changeSort}
                  />
                  <th className="px-3 py-2 font-medium">Media</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedRoutes.rows.map((route) => {
                  const editing = editingId === route._id ? rowDraft : null;
                  if (!editing) {
                    return (
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
                        <td className="px-3 py-2 align-top">
                          {route.tags || "—"}
                        </td>
                        <td className="px-3 py-2 align-top text-muted">
                          {mediaCountLabel(route.media)}
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
                    );
                  }

                  return (
                    <tr
                      key={route._id}
                      className="border-t border-border bg-surface/70 text-foreground"
                      data-testid="land-route-inline-row"
                    >
                      <td className="px-3 py-2 align-top">
                        <AdminInlineSelect
                          value={editing.type}
                          onChange={(event) =>
                            updateRow(
                              "type",
                              event.target.value as SurfaceRouteWriteInput["type"],
                            )
                          }
                          onSave={() => void saveRow()}
                          onCancel={cancelEdit}
                          data-testid="land-route-inline-type"
                        >
                          {SURFACE_ROUTE_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </AdminInlineSelect>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <AdminInlineInput
                          value={editing.date}
                          onChange={(event) =>
                            updateRow("date", event.target.value)
                          }
                          onSave={() => void saveRow()}
                          onCancel={cancelEdit}
                          data-testid="land-route-inline-date"
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
                              data-testid="land-route-inline-departure"
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
                              data-testid="land-route-inline-arrival"
                            />
                          </AdminInlineField>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="grid grid-cols-2 gap-1">
                          <AdminInlineField label="From lat">
                            <AdminInlineInput
                              value={editing.departure_latitude}
                              onChange={(event) =>
                                updateRow(
                                  "departure_latitude",
                                  event.target.value,
                                )
                              }
                              onSave={() => void saveRow()}
                              onCancel={cancelEdit}
                            />
                          </AdminInlineField>
                          <AdminInlineField label="From lng">
                            <AdminInlineInput
                              value={editing.departure_longitude}
                              onChange={(event) =>
                                updateRow(
                                  "departure_longitude",
                                  event.target.value,
                                )
                              }
                              onSave={() => void saveRow()}
                              onCancel={cancelEdit}
                            />
                          </AdminInlineField>
                          <AdminInlineField label="To lat">
                            <AdminInlineInput
                              value={editing.arrival_latitude}
                              onChange={(event) =>
                                updateRow("arrival_latitude", event.target.value)
                              }
                              onSave={() => void saveRow()}
                              onCancel={cancelEdit}
                            />
                          </AdminInlineField>
                          <AdminInlineField label="To lng">
                            <AdminInlineInput
                              value={editing.arrival_longitude}
                              onChange={(event) =>
                                updateRow(
                                  "arrival_longitude",
                                  event.target.value,
                                )
                              }
                              onSave={() => void saveRow()}
                              onCancel={cancelEdit}
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
                          data-testid="land-route-inline-tags"
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
                          testId="land-route-inline-media"
                        />
                      </td>
                      <td className="px-3 py-2 align-top whitespace-nowrap">
                        <button
                          type="button"
                          className="mr-3 text-accent hover:underline disabled:opacity-60"
                          disabled={saving}
                          onClick={() => void saveRow()}
                          data-testid="land-route-inline-save"
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          className="mr-3 text-foreground hover:underline"
                          onClick={cancelEdit}
                          data-testid="land-route-inline-cancel"
                        >
                          Cancel
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
                  );
                })}
              </tbody>
            </table>
            {pagedRoutes.total === 0 ? (
              <p className="px-3 py-4 text-sm text-muted">
                {search.trim()
                  ? "No routes match your search."
                  : "No routes yet."}
              </p>
            ) : (
              <AdminPagination
                edge="bottom"
                testId="admin-pagination-bottom"
                page={pagedRoutes.page}
                totalPages={pagedRoutes.totalPages}
                start={pagedRoutes.start}
                end={pagedRoutes.end}
                total={pagedRoutes.total}
                onPageChange={goToPage}
              />
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
