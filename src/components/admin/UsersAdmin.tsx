"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  USER_ROLE_NAMES,
  userWriteSchema,
  type PublicUserRecord,
} from "@/lib/validations/user-write";

type UserFormState = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: (typeof USER_ROLE_NAMES)[number];
};

const EMPTY_FORM: UserFormState = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "user",
};

export function UsersAdmin() {
  const [users, setUsers] = useState<PublicUserRecord[]>([]);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    setStatus("loading");
    setMessage(null);
    try {
      const response = await fetch("/api/users");
      const body = (await response.json()) as {
        ok: boolean;
        data?: PublicUserRecord[];
        error?: string;
      };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to load users");
      }
      setUsers(body.data ?? []);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to load");
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  function updateField<K extends keyof UserFormState>(
    key: K,
    value: UserFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const parsed = userWriteSchema.safeParse(form);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Invalid user");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Save failed");
      }
      setForm(EMPTY_FORM);
      await loadUsers();
      setMessage("User created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Users admin</h1>
        <p className="mt-2 text-sm text-muted">
          Create accounts and assign roles.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 border border-border bg-surface/60 p-4 sm:grid-cols-2"
        data-testid="users-admin-form"
      >
        <h2 className="font-display text-xl text-foreground sm:col-span-2">
          Add user
        </h2>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Username
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.username}
            onChange={(event) => updateField("username", event.target.value)}
            data-testid="admin-user-username"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Email
          <input
            type="email"
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            data-testid="admin-user-email"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Password
          <input
            type="password"
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            data-testid="admin-user-password"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Confirm password
          <input
            type="password"
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.confirmPassword}
            onChange={(event) =>
              updateField("confirmPassword", event.target.value)
            }
            data-testid="admin-user-confirm-password"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2">
          Role
          <select
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.role}
            onChange={(event) =>
              updateField(
                "role",
                event.target.value as UserFormState["role"],
              )
            }
            data-testid="admin-user-role"
          >
            {USER_ROLE_NAMES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            data-testid="admin-user-save"
          >
            {saving ? "Creating…" : "Add user"}
          </button>
        </div>
      </form>

      {message ? (
        <p className="text-sm text-muted" data-testid="users-admin-message">
          {message}
        </p>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-foreground">
            Existing users ({users.length})
          </h2>
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            Refresh
          </button>
        </div>

        {status === "loading" ? (
          <p className="text-sm text-muted">Loading users…</p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm text-red-300">{message}</p>
        ) : null}

        {status === "ready" ? (
          <div className="overflow-x-auto border border-border">
            <table
              className="min-w-full text-left text-sm"
              data-testid="users-table"
            >
              <thead className="bg-surface text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Username</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Roles</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user._id}
                    className="border-t border-border text-foreground"
                  >
                    <td className="px-3 py-2">{user.username}</td>
                    <td className="px-3 py-2">{user.email}</td>
                    <td className="px-3 py-2 text-muted">
                      {user.roles.join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
