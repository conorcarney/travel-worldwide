"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

type LoginFormProps = {
  callbackUrl: string;
};

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4" data-testid="login-form">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <label className="flex flex-col gap-1 text-sm text-muted">
        Email or username
        <input
          name="email"
          type="text"
          autoComplete="username"
          required
          className="rounded border border-border bg-background px-3 py-2 text-foreground"
          data-testid="login-email"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded border border-border bg-background px-3 py-2 text-foreground"
          data-testid="login-password"
        />
      </label>

      {state.error ? (
        <p className="text-sm text-red-300" data-testid="login-error">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        data-testid="login-submit"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
