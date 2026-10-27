"use client";

import { useState, useTransition } from "react";
import { saveFeedback } from "@/app/actions/feedback";
import { Button } from "@/components/ui/Button";

// Rating, "finished it", and an optional note. Saves on demand; saving again
// replaces the earlier feedback for this plan.
export function PlanFeedback({ planId }: { planId: string }) {
  const [rating, setRating] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const { ok } = await saveFeedback({ sessionPlanId: planId, rating, finished, note });
      setStatus(ok ? "saved" : "error");
    });
  }

  return (
    <section aria-label="Feedback" className="mt-6 rounded-lg border border-border bg-surface p-4">
      <p className="font-medium">How did this plan go?</p>
      <fieldset className="mt-3">
        <legend className="sr-only">Rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input
                type="radio"
                name={`rating-${planId}`}
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`inline-flex size-11 items-center justify-center rounded-lg text-2xl peer-focus-visible:outline-2 peer-focus-visible:outline-accent ${
                  rating !== null && n <= rating ? "text-accent" : "text-text-muted"
                }`}
              >
                ★
              </span>
              <span className="sr-only">
                {n} star{n > 1 ? "s" : ""}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={finished}
          onChange={(e) => setFinished(e.target.checked)}
          className="size-4 accent-success"
        />
        I finished it
      </label>
      <label className="mt-3 block text-sm text-text-muted">
        Anything off? (optional)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          rows={2}
          className="mt-1 block w-full rounded-lg border border-border bg-background p-2 text-text focus-visible:outline-2 focus-visible:outline-accent"
        />
      </label>
      <div className="mt-3 flex items-center gap-3">
        <Button variant="secondary" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save feedback"}
        </Button>
        <p aria-live="polite" className="text-sm">
          {status === "saved" && <span className="text-success">Thanks. Saved.</span>}
          {status === "error" && (
            <span className="text-danger">Couldn&apos;t save. Try again.</span>
          )}
        </p>
      </div>
    </section>
  );
}
