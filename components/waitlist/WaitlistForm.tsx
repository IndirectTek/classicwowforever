"use client";

// Client Component only so we can show pending and result states.
// useActionState is roughly: post the form, then re-render with what the
// action returned (like a controller re-rendering `new` with errors).
import { useActionState } from "react";
import { joinWaitlist } from "@/app/actions/waitlist";
import type { WaitlistState } from "@/lib/waitlist";
import { Button } from "@/components/ui/Button";

const initialState: WaitlistState = { status: "idle" };

export function WaitlistForm() {
  const [state, formAction, pending] = useActionState(joinWaitlist, initialState);

  if (state.status === "success") {
    return (
      <p role="status" className="rounded-lg border border-border bg-surface p-4 text-success">
        You&apos;re on the list. We&apos;ll send one email when the planner opens, and that&apos;s
        it.
      </p>
    );
  }

  return (
    <form action={formAction} className="w-full max-w-md" noValidate>
      <label htmlFor="waitlist-email" className="mb-2 block text-sm text-text-muted">
        Get one email when the planner opens
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="waitlist-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          // React clears the form after the action runs; put the email back on errors.
          defaultValue={state.status === "error" ? state.email : undefined}
          aria-invalid={state.status === "error"}
          aria-describedby={state.status === "error" ? "waitlist-error" : undefined}
          className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-text placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-accent sm:h-10 sm:flex-1"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Joining…" : "Join the waitlist"}
        </Button>
      </div>
      {/* Honeypot. Hidden from people and from assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p id="waitlist-error" aria-live="polite" className="mt-2 min-h-5 text-sm text-danger">
        {state.status === "error" ? state.message : ""}
      </p>
    </form>
  );
}
