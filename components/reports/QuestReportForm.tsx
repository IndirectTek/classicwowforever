"use client";

// The quest report form. Posts to a Server Action (like a Rails form posting
// to a controller action) and shows the result in place. Zone, game, date and
// credit stay filled in after a save, since reports tend to come in batches.
import { useActionState, useState, useSyncExternalStore } from "react";
import { submitReport, type ReportFormState } from "@/app/actions/reports";
import { Button } from "@/components/ui/Button";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { reportGameLabels, reportGames, type ReportGame } from "@/lib/reports";
import type { Zone } from "@/lib/zones";

export type ReportDefaults = {
  zone_id: string;
  faction: "alliance" | "horde" | "both";
  game: ReportGame;
  seen_on: string;
};

const initialState: ReportFormState = { status: "idle" };

const factionOptions = [
  { value: "alliance" as const, label: "Alliance" },
  { value: "horde" as const, label: "Horde" },
  { value: "both" as const, label: "Both" },
];

// Today in the visitor's time zone (the server only knows UTC).
function useLocalToday(serverToday: string): string {
  return useSyncExternalStore(
    () => () => {},
    () => new Date().toLocaleDateString("en-CA"),
    () => serverToday,
  );
}

export function QuestReportForm({ zones, defaults }: { zones: Zone[]; defaults: ReportDefaults }) {
  const [state, formAction, pending] = useActionState(submitReport, initialState);
  const [faction, setFaction] = useState(defaults.faction);
  const [game, setGame] = useState(defaults.game);
  const today = useLocalToday(defaults.seen_on);

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  // After an error, everything typed comes back. After a save, only the
  // fields that usually stay the same.
  const typed = state.status === "error" ? state.values : undefined;
  const kept = state.status === "saved" ? state.values : undefined;

  return (
    <form action={formAction} className="rounded-lg border border-border bg-surface p-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Quest name" error={errors.name} className="sm:col-span-2">
          <input
            name="name"
            defaultValue={typed?.name}
            required
            maxLength={100}
            autoComplete="off"
            placeholder="As the quest log shows it"
            className={inputClass}
          />
        </Field>
        <Field label="Zone" error={errors.zone_id}>
          <select
            name="zone_id"
            defaultValue={typed?.zone_id ?? kept?.zone_id ?? defaults.zone_id}
            className={inputClass}
          >
            <option value="" disabled>
              Pick a zone
            </option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From level" error={errors.min_level}>
            <input
              name="min_level"
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              defaultValue={typed?.min_level}
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="To level" error={errors.max_level}>
            <input
              name="max_level"
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              defaultValue={typed?.max_level}
              className={`${inputClass} font-mono`}
            />
          </Field>
        </div>
      </div>
      <p className="mt-2 text-sm text-text-muted">
        Levels: when it becomes available, and roughly when it stops being worth the time.
      </p>

      <div className="mt-5">
        <ChipGroup
          legend="Who can do it"
          name="faction"
          options={factionOptions}
          value={faction}
          onChange={setFaction}
        />
        {errors.faction && <p className="mt-1 text-sm text-danger">{errors.faction}</p>}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field label="Minutes it took (optional)" error={errors.est_minutes}>
          <input
            name="est_minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={240}
            defaultValue={typed?.est_minutes}
            className={`${inputClass} font-mono`}
          />
        </Field>
        <Field label="Notes (optional)" error={errors.notes}>
          <input
            name="notes"
            defaultValue={typed?.notes}
            maxLength={300}
            autoComplete="off"
            placeholder="Where it starts, what to bring, what to pair it with"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <ChipGroup
            legend="Where you played it"
            name="game"
            options={reportGames.map((g) => ({ value: g, label: reportGameLabels[g] }))}
            value={game}
            onChange={setGame}
          />
          {game === "classic-era" && (
            <p className="mt-2 text-sm text-text-muted">
              Thanks! We&apos;ll recheck it in WoW Forever, since some quests may change.
            </p>
          )}
        </div>
        <Field label="Day you played it" error={errors.seen_on}>
          <input
            name="seen_on"
            type="date"
            defaultValue={typed?.seen_on ?? kept?.seen_on ?? today}
            max={today}
            className={`${inputClass} font-mono`}
          />
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Credit me as (optional)" error={errors.credit_name}>
          <input
            name="credit_name"
            defaultValue={typed?.credit_name ?? kept?.credit_name}
            maxLength={40}
            autoComplete="nickname"
            placeholder="Your name in the public data files, or leave blank"
            className={inputClass}
          />
        </Field>
      </div>

      <p aria-live="polite" className="mt-4 min-h-5 text-sm">
        {state.status === "error" && <span className="text-danger">{state.message}</span>}
        {state.status === "saved" && (
          <span className="text-success">
            Thanks! &ldquo;{state.name}&rdquo; is in the queue
            {state.kind === "correction" ? " as a correction to the quest we have" : ""}. Got
            another?
          </span>
        )}
      </p>
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Sending…" : "Send report"}
      </Button>
    </form>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-text focus-visible:outline-2 focus-visible:outline-accent sm:h-10";

function Field({
  label: text,
  error,
  className = "",
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm text-text-muted">{text}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
    </label>
  );
}
