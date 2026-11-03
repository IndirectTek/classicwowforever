"use client";

// The front page prompt: "tell us your evening" in one line. Submits as a
// plain GET to /plan?q=... (like a Rails search form with method: :get), so
// it works without JavaScript; with it, the chips below show what we
// understood as you type.
import Form from "next/form";
import { useState } from "react";
import { label } from "@/lib/game";
import { goalLabels } from "@/lib/schema";
import { parseSessionPrompt, PROMPT_MAX } from "@/lib/sessionPrompt";

type ZoneName = { id: string; name: string };

const examples = [
  "An hour on my level 12 dwarf hunter in Loch Modan",
  "90 minutes in the Barrens, want gold",
  "30 min, something relaxed",
];

export function SessionPrompt({ zones }: { zones: ZoneName[] }) {
  const [text, setText] = useState("");
  const parsed = parseSessionPrompt(text, zones);
  const zoneName = zones.find((z) => z.id === parsed.zoneId)?.name;

  const chips = [
    parsed.minutes && `${parsed.minutes} min`,
    parsed.level && `Level ${parsed.level}`,
    (parsed.race || parsed.class) &&
      [parsed.race && label(parsed.race), parsed.class && label(parsed.class)]
        .filter(Boolean)
        .join(" "),
    zoneName,
    parsed.goal && goalLabels[parsed.goal],
    parsed.withGroup && "With a group",
  ].filter(Boolean) as string[];

  return (
    <Form action="/plan" className="max-w-2xl">
      <label htmlFor="session-prompt" className="mb-2 block text-sm text-text-muted">
        What does tonight look like?
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="session-prompt"
          name="q"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={PROMPT_MAX}
          autoComplete="off"
          placeholder="45 minutes on my level 12 dwarf hunter, want gold"
          className="h-12 w-full rounded-lg border border-border bg-surface px-4 text-text placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-accent sm:flex-1"
        />
        <button
          type="submit"
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg bg-accent px-6 font-medium text-accent-text hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Plan my session
        </button>
      </div>

      <div aria-live="polite" className="mt-3 min-h-9">
        {chips.length > 0 ? (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-text-muted">We heard:</span>
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-accent px-3 py-1 font-mono text-accent"
              >
                {chip}
              </span>
            ))}
          </p>
        ) : (
          <p className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
            Try:
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setText(example)}
                className="rounded-full border border-border px-3 py-1 text-left hover:border-accent hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
              >
                {example}
              </button>
            ))}
          </p>
        )}
      </div>
    </Form>
  );
}
