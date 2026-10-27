"use client";

// Add or edit a character in a modal. The native <dialog> element gives us
// focus trapping, Escape to close and a backdrop without a library.
import { useActionState, useEffect, useRef, useState } from "react";
import { deleteCharacter, saveCharacter, type CharacterFormState } from "@/app/actions/characters";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ChipGroup } from "@/components/ui/ChipGroup";
import type { Character } from "@/lib/characters";
import { classesFor, label, racesFor, type Faction, type Race } from "@/lib/game";
import type { Zone } from "@/lib/zones";

type Props = {
  zones: Zone[];
  character?: Character;
  trigger: "card" | "button";
};

const initialState: CharacterFormState = { status: "idle" };

export function CharacterDialog({ zones, character, trigger }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Bumped after each save so the form remounts: a fresh "Add" form, or an
  // "Edit" form showing the saved values (and no leftover "saved" state).
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      {trigger === "card" ? (
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-text-muted hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span aria-hidden="true" className="text-3xl leading-none">
            +
          </span>
          Add character
        </button>
      ) : (
        <Button variant="secondary" onClick={() => dialogRef.current?.showModal()}>
          Edit
        </Button>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby="character-dialog-title"
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg border border-border bg-surface-raised p-0 text-text backdrop:bg-black/60"
      >
        <CharacterForm
          key={formKey}
          zones={zones}
          character={character}
          onDone={() => {
            dialogRef.current?.close();
            setFormKey((k) => k + 1);
          }}
          onCancel={() => dialogRef.current?.close()}
        />
      </dialog>
    </>
  );
}

function CharacterForm({
  zones,
  character,
  onDone,
  onCancel,
}: {
  zones: Zone[];
  character?: Character;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveCharacter, initialState);
  const [faction, setFaction] = useState<Faction>(character?.faction ?? "alliance");
  const [race, setRace] = useState<Race>((character?.race as Race) ?? racesFor(faction)[0]);
  const [charClass, setCharClass] = useState<string>(character?.class ?? classesFor(race)[0]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Close once the save lands (the dialog lives outside React's state).
  // onDone remounts this form, so this runs once per save.
  useEffect(() => {
    if (state.status === "saved") onDone();
  }, [state, onDone]);

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  // After a failed save, show what was typed rather than the original values.
  const typed = state.status === "error" ? state.values : undefined;

  function chooseFaction(next: Faction) {
    setFaction(next);
    const firstRace = racesFor(next)[0];
    setRace(firstRace);
    setCharClass(classesFor(firstRace)[0]);
  }

  function chooseRace(next: Race) {
    setRace(next);
    if (!classesFor(next).includes(charClass as never)) setCharClass(classesFor(next)[0]);
  }

  // Zones open to this faction: its own, contested ones, and its capitals.
  const zoneOptions = zones.filter((z) => z.faction === faction || z.faction === "contested");

  return (
    <form action={formAction} className="p-6" noValidate>
      <h2 id="character-dialog-title" className="font-display text-3xl font-bold">
        {character ? `Edit ${character.name}` : "Add a character"}
      </h2>
      {character && <input type="hidden" name="id" value={character.id} />}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Name" error={errors.name}>
          <input
            name="name"
            defaultValue={typed?.name ?? character?.name}
            required
            maxLength={12}
            autoComplete="off"
            className={inputClass}
          />
        </Field>
        <Field label="Realm (optional)" error={errors.realm}>
          <input
            name="realm"
            defaultValue={typed?.realm ?? character?.realm ?? ""}
            maxLength={40}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mt-4">
        <ChipGroup
          legend="Faction"
          name="faction"
          options={[
            { value: "alliance", label: "Alliance" },
            { value: "horde", label: "Horde" },
          ]}
          value={faction}
          onChange={chooseFaction}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Race" error={errors.race}>
          <select
            name="race"
            value={race}
            onChange={(e) => chooseRace(e.target.value as Race)}
            className={inputClass}
          >
            {racesFor(faction).map((r) => (
              <option key={r} value={r}>
                {label(r)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Class" error={errors.class}>
          <select
            name="class"
            value={charClass}
            onChange={(e) => setCharClass(e.target.value)}
            className={inputClass}
          >
            {classesFor(race).map((c) => (
              <option key={c} value={c}>
                {label(c)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Level" error={errors.level}>
          <input
            name="level"
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            defaultValue={typed?.level ?? character?.level ?? 1}
            className={`${inputClass} font-mono`}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Current zone (optional)" error={errors.zone_id}>
          <select
            name="zone_id"
            defaultValue={typed?.zone_id ?? character?.zone_id ?? ""}
            key={faction}
            className={inputClass}
          >
            <option value="">Not sure / somewhere else</option>
            {zoneOptions.map((z) => (
              <option key={z.id} value={z.id}>
                {z.kind === "city" ? z.name : `${z.name} (${z.min_level}–${z.max_level})`}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <p aria-live="polite" className="mt-4 min-h-5 text-sm text-danger">
        {state.status === "error" ? state.message : ""}
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : character ? "Save changes" : "Add character"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        {character && !confirmingDelete && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-sm text-danger underline underline-offset-2"
          >
            Delete character
          </button>
        )}
      </div>

      {character && confirmingDelete && (
        <div className="mt-4 rounded-lg border border-danger p-4">
          <p className="text-sm">
            Delete {character.name} and every plan made for them? This can&apos;t be undone.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              formAction={deleteCharacter.bind(null, character.id)}
              formNoValidate
              className={buttonClasses("danger")}
            >
              Delete {character.name}
            </button>
            <Button type="button" variant="ghost" onClick={() => setConfirmingDelete(false)}>
              Keep
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-text focus-visible:outline-2 focus-visible:outline-accent sm:h-10";

function Field({
  label: text,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-text-muted">{text}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
    </label>
  );
}
