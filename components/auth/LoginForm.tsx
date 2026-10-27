"use client";

import { useActionState, useSyncExternalStore } from "react";
import { sendMagicLink, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { DEFAULT_AFTER_SIGN_IN, safeNextPath } from "@/lib/safeNext";

const initialState: LoginState = { status: "idle" };

// Read ?next= and ?error= from the address bar in the browser. The page
// renders this form immediately (so nothing you type gets replaced when the
// session check finishes); the server never needs these values.
const noSubscribe = () => () => {};
function useQuery() {
  const search = useSyncExternalStore(
    noSubscribe,
    () => window.location.search,
    () => "",
  );
  const params = new URLSearchParams(search);
  return {
    next: search ? safeNextPath(params.get("next")) : DEFAULT_AFTER_SIGN_IN,
    linkError: params.get("error") === "link",
  };
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);
  const { next, linkError } = useQuery();

  if (state.status === "sent") {
    return (
      <div role="status" className="rounded-lg border border-border bg-surface p-6">
        <p className="text-lg font-medium">Check your email</p>
        <p className="mt-2 text-text-muted">
          We sent a sign-in link to <span className="text-text">{state.email}</span>. It works once
          and expires in an hour. You can close this tab.
        </p>
      </div>
    );
  }

  const error =
    state.status === "error"
      ? state.message
      : linkError
        ? "That link has expired or was already used. Send yourself a new one."
        : "";

  return (
    <form action={formAction} className="rounded-lg border border-border bg-surface p-6" noValidate>
      <input type="hidden" name="next" value={next} />
      <label htmlFor="login-email" className="mb-2 block text-sm text-text-muted">
        Email
      </label>
      <input
        id="login-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        autoFocus
        placeholder="you@example.com"
        // React clears the form after the action runs; put the email back on errors.
        defaultValue={state.status === "error" ? state.email : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "login-error" : undefined}
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-text placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-accent sm:h-10"
      />
      <p id="login-error" aria-live="polite" className="mt-2 min-h-5 text-sm text-danger">
        {error}
      </p>
      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
      <p className="mt-4 text-sm text-text-muted">
        No password needed. New here? The same link creates your account.
      </p>
    </form>
  );
}
