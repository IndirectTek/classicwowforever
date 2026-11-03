"use client";

// The rest of the group for a group session: class, level and a preferred
// role for each player. The roles shown underneath come from the same
// assignRoles() the server uses, so what you see is what the plan gets.
import { classesFor, label, racesFor, type CharacterClass, type Faction } from "@/lib/game";
import {
  assignRoles,
  classRoles,
  PARTY_MAX,
  roleLabels,
  roles,
  type PartyMember,
} from "@/lib/planner/group";

type Props = {
  leader: { name: string; class: CharacterClass; level: number; faction: Faction };
  party: PartyMember[];
  onChange: (party: PartyMember[]) => void;
};

export function PartyEditor({ leader, party, onChange }: Props) {
  // Classes this faction can play (no paladins for the Horde, no shamans for the Alliance).
  const classOptions = [...new Set(racesFor(leader.faction).flatMap((r) => classesFor(r)))];
  const members = [{ class: leader.class, level: leader.level, prefers: "any" as const }, ...party];
  const { roles: assigned, missing } = assignRoles(members);

  const update = (i: number, patch: Partial<PartyMember>) =>
    onChange(party.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm text-text-muted">The rest of your group</legend>
      {party.map((member, i) => (
        // On phones the role picker drops to its own line under class and level.
        <div
          key={i}
          className="grid grid-cols-[1fr_4.5rem_auto] items-center gap-2 sm:grid-cols-[1fr_4.5rem_1fr_auto]"
        >
          <select
            aria-label={`Player ${i + 2} class`}
            value={member.class}
            onChange={(e) => {
              const next = e.target.value as CharacterClass;
              const keep = member.prefers !== "any" && classRoles[next].includes(member.prefers);
              update(i, { class: next, prefers: keep ? member.prefers : "any" });
            }}
            className={inputClass}
          >
            {classOptions.map((c) => (
              <option key={c} value={c}>
                {label(c)}
              </option>
            ))}
          </select>
          <input
            aria-label={`Player ${i + 2} level`}
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            value={member.level}
            onChange={(e) =>
              update(i, { level: Math.min(60, Math.max(1, Number(e.target.value) || 1)) })
            }
            className={`${inputClass} font-mono`}
          />
          <select
            aria-label={`Player ${i + 2} role`}
            value={member.prefers}
            onChange={(e) => update(i, { prefers: e.target.value as PartyMember["prefers"] })}
            className={`${inputClass} order-last col-span-2 sm:order-none sm:col-span-1`}
          >
            <option value="any">Any role</option>
            {roles
              .filter((r) => classRoles[member.class].includes(r))
              .map((r) => (
                <option key={r} value={r}>
                  Wants {roleLabels[r].toLowerCase()}
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={() => onChange(party.filter((_, j) => j !== i))}
            aria-label={`Remove player ${i + 2}`}
            className="inline-flex size-11 items-center justify-center rounded-lg text-xl text-text-muted hover:bg-surface-raised hover:text-text focus-visible:outline-2 focus-visible:outline-accent sm:size-10"
          >
            ×
          </button>
        </div>
      ))}
      {party.length < PARTY_MAX && (
        <button
          type="button"
          onClick={() =>
            onChange([...party, { class: classOptions[0], level: leader.level, prefers: "any" }])
          }
          className="text-sm text-accent underline underline-offset-2"
        >
          + Add a player
        </button>
      )}

      <div aria-live="polite" className="rounded-lg bg-surface-raised p-3 text-sm">
        <p className="text-text-muted">Roles</p>
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {members.map((m, i) => (
            <li key={i}>
              {i === 0 ? leader.name : `Player ${i + 1}`}{" "}
              <span className="text-text-muted">
                ({label(m.class)} {m.level})
              </span>
              : <span className="text-accent">{roleLabels[assigned[i]]}</span>
            </li>
          ))}
        </ul>
        {missing.length > 0 && members.length >= 3 && (
          <p className="mt-2 text-warning">
            Nobody can {missing.map((r) => (r === "tank" ? "tank" : "heal")).join(" or ")}. For a
            dungeon, the plan starts with finding{" "}
            {missing.map((r) => (r === "tank" ? "a tank" : "a healer")).join(" and ")}.
          </p>
        )}
      </div>
    </fieldset>
  );
}

const inputClass =
  "h-11 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-text focus-visible:outline-2 focus-visible:outline-accent sm:h-10";
