import Link from "next/link";
import type { Character } from "@/lib/characters";
import { label } from "@/lib/game";

export function CharacterCard({
  character,
  zoneName,
}: {
  character: Character;
  zoneName?: string;
}) {
  return (
    <Link
      href={`/characters/${character.id}`}
      className="group flex min-h-40 flex-col rounded-lg border border-border bg-surface p-6 hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold group-hover:text-accent">{character.name}</h2>
        <span className="font-mono text-sm text-text-muted">Lv {character.level}</span>
      </div>
      <p className="mt-1 text-text-muted">
        {label(character.race)} {label(character.class)}
        {character.realm && <> · {character.realm}</>}
      </p>
      <p className="mt-auto pt-4 text-sm text-text-muted">
        {zoneName ?? "Zone not set"}
        <span aria-hidden="true"> · </span>
        {character.last_plan_at
          ? `Last plan ${formatDate(character.last_plan_at)}`
          : "No plans yet"}
      </p>
    </Link>
  );
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
