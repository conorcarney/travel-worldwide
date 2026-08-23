"use client";

import { useActionState } from "react";
import { contactAction, type ContactState } from "@/app/contact/actions";

const initialState: ContactState = {};

const fieldClass =
  "rounded border border-border bg-background px-3 py-2 text-foreground";

export function ContactForm() {
  const [state, formAction, pending] = useActionState(
    contactAction,
    initialState,
  );

  if (state.success) {
    return (
      <p
        className="mt-8 rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-foreground"
        data-testid="contact-success"
      >
        Thanks — your message has been sent.
      </p>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-8 flex flex-col gap-4"
      data-testid="contact-form"
    >
      <label className="sr-only" aria-hidden>
        Website
        <input name="website" type="text" tabIndex={-1} autoComplete="off" />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Name
        <input
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={120}
          className={fieldClass}
          data-testid="contact-name"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className={fieldClass}
          data-testid="contact-email"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Message
        <textarea
          name="message"
          required
          rows={6}
          maxLength={5000}
          className={`${fieldClass} resize-y`}
          data-testid="contact-message"
        />
      </label>

      {state.error ? (
        <p className="text-sm text-red-300" data-testid="contact-error">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        data-testid="contact-submit"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
