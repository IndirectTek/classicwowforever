import { label } from "@/lib/game";
import { noDungeonText, roleLabels } from "@/lib/planner/group";
import type { GroupInfo } from "@/lib/schema";

// Who plays what, and the dungeon, above a group plan's steps. Only classes
// and levels: the other players are real people and plans can be shared.
export function GroupPanel({ group, leaderName }: { group: GroupInfo; leaderName: string }) {
  const gaps = [
    ...group.missing.map((r) => (r === "tank" ? "a tank" : "a healer")),
    ...(group.openSlots > group.missing.length
      ? [
          `${group.openSlots - group.missing.length} more player${group.openSlots - group.missing.length > 1 ? "s" : ""}`,
        ]
      : []),
  ];

  return (
    <section aria-label="Group" className="mb-6 rounded-lg bg-surface-raised p-4">
      <p className="text-sm text-text-muted">
        {group.dungeon ? (
          <>
            Dungeon: <span className="font-medium text-text">{group.dungeon.name}</span>
          </>
        ) : group.noDungeonReason ? (
          noDungeonText[group.noDungeonReason]
        ) : (
          "Questing together"
        )}
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {group.members.map((m, i) => (
          <li key={i} className="rounded-full border border-border px-3 py-1 text-sm">
            {i === 0 ? leaderName : `${label(m.class)} ${m.level}`}
            {i === 0 && (
              <span className="text-text-muted">
                {" "}
                ({label(m.class)} {m.level})
              </span>
            )}
            <span className="text-accent"> · {roleLabels[m.role]}</span>
          </li>
        ))}
      </ul>
      {gaps.length > 0 && (
        <p className="mt-2 text-sm text-warning">Still looking for {gaps.join(" and ")}.</p>
      )}
    </section>
  );
}
