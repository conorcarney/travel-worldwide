"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  blogWriteSchema,
  slugifyBlogUrl,
  type BlogRecord,
} from "@/lib/validations/blog-write";

type BlogFormState = {
  name: string;
  date_of_first_visit: string;
  url: string;
  blog_title: string;
  blog_description: string;
  tags: string;
};

const EMPTY_FORM: BlogFormState = {
  name: "",
  date_of_first_visit: "",
  url: "",
  blog_title: "",
  blog_description: "",
  tags: "",
};

function toFormState(blog: BlogRecord): BlogFormState {
  return {
    name: blog.name ?? "",
    date_of_first_visit: blog.date_of_first_visit ?? "",
    url: blog.url ?? "",
    blog_title: blog.blog_title ?? "",
    blog_description: blog.blog_description ?? "",
    tags: blog.tags ?? "",
  };
}

export function BlogsAdmin() {
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [form, setForm] = useState<BlogFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [urlTouched, setUrlTouched] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadBlogs() {
    setStatus("loading");
    setMessage(null);
    try {
      const response = await fetch("/api/blogs?scope=all");
      const body = (await response.json()) as {
        ok: boolean;
        data?: BlogRecord[];
        error?: string;
      };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to load blogs");
      }
      setBlogs(body.data ?? []);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to load");
    }
  }

  useEffect(() => {
    void loadBlogs();
  }, []);

  function updateField<K extends keyof BlogFormState>(
    key: K,
    value: BlogFormState[K],
  ) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "blog_title" && !urlTouched) {
        next.url = slugifyBlogUrl(String(value));
      }
      if (key === "name" && !urlTouched && !current.blog_title.trim()) {
        next.url = slugifyBlogUrl(String(value));
      }
      return next;
    });
  }

  function startEdit(blog: BlogRecord) {
    setEditingId(blog._id);
    setForm(toFormState(blog));
    setUrlTouched(true);
    setMessage(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setUrlTouched(false);
    setMessage(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const parsed = blogWriteSchema.safeParse(form);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Invalid blog");
      return;
    }

    setSaving(true);
    const wasEditing = Boolean(editingId);
    try {
      const response = await fetch(
        editingId ? `/api/blogs/id/${editingId}` : "/api/blogs",
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
      await loadBlogs();
      setMessage(wasEditing ? "Blog updated." : "Blog added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this blog post?")) return;
    setMessage(null);
    try {
      const response = await fetch(`/api/blogs/id/${id}`, { method: "DELETE" });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Delete failed");
      }
      if (editingId === id) resetForm();
      await loadBlogs();
      setMessage("Blog deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Blogs admin</h1>
        <p className="mt-2 text-sm text-muted">
          Add or edit travel blog posts. Use tags like{" "}
          <code className="text-foreground">Hidden</code> or{" "}
          <code className="text-foreground">Draft</code> to keep a post off the
          public list.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 border border-border bg-surface/60 p-4 sm:grid-cols-2"
        data-testid="blog-form"
      >
        <h2 className="font-display text-xl text-foreground sm:col-span-2">
          {editingId ? "Update blog" : "Add blog"}
        </h2>

        <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2">
          Title
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.blog_title}
            onChange={(event) => updateField("blog_title", event.target.value)}
            data-testid="blog-title"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Country
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Hungary"
            data-testid="blog-country"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Date of first visit
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.date_of_first_visit}
            onChange={(event) =>
              updateField("date_of_first_visit", event.target.value)
            }
            placeholder="01/2013"
            data-testid="blog-date"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          URL slug
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.url}
            onChange={(event) => {
              setUrlTouched(true);
              updateField("url", slugifyBlogUrl(event.target.value));
            }}
            placeholder="hungary"
            data-testid="blog-url"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Tags (optional)
          <input
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.tags}
            onChange={(event) => updateField("tags", event.target.value)}
            placeholder="Draft, Hidden"
            data-testid="blog-tags"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2">
          Description / story
          <textarea
            className="min-h-40 rounded border border-border bg-background px-3 py-2 text-foreground"
            value={form.blog_description}
            onChange={(event) =>
              updateField("blog_description", event.target.value)
            }
            data-testid="blog-description"
            required
          />
        </label>

        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            data-testid="blog-save"
          >
            {saving ? "Saving…" : editingId ? "Update blog" : "Add blog"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground"
              data-testid="blog-cancel-edit"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      {message ? (
        <p className="text-sm text-muted" data-testid="blog-admin-message">
          {message}
        </p>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-foreground">
            Existing blogs ({blogs.length})
          </h2>
          <button
            type="button"
            onClick={() => void loadBlogs()}
            className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            Refresh
          </button>
        </div>

        {status === "loading" ? (
          <p className="text-sm text-muted">Loading blogs…</p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm text-red-300">{message}</p>
        ) : null}

        {status === "ready" ? (
          <div className="overflow-x-auto border border-border">
            <table className="min-w-full text-left text-sm" data-testid="blogs-table">
              <thead className="bg-surface text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Country</th>
                  <th className="px-3 py-2 font-medium">Slug</th>
                  <th className="px-3 py-2 font-medium">Tags</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blogs.map((blog) => (
                  <tr
                    key={blog._id}
                    className="border-t border-border text-foreground"
                  >
                    <td className="px-3 py-2 align-top">{blog.blog_title}</td>
                    <td className="px-3 py-2 align-top">{blog.name}</td>
                    <td className="px-3 py-2 align-top text-muted">{blog.url}</td>
                    <td className="px-3 py-2 align-top text-muted">
                      {blog.tags || "—"}
                    </td>
                    <td className="px-3 py-2 align-top whitespace-nowrap">
                      <button
                        type="button"
                        className="mr-3 text-accent hover:underline"
                        onClick={() => startEdit(blog)}
                        data-testid={`blog-edit-${blog._id}`}
                      >
                        Edit
                      </button>
                      <Link
                        href={`/blogs/${blog.url}`}
                        className="mr-3 text-accent hover:underline"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        className="text-red-300 hover:underline"
                        onClick={() => void onDelete(blog._id)}
                        data-testid={`blog-delete-${blog._id}`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {blogs.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted">No blogs yet.</p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
