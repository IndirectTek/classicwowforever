import { label } from "@/lib/game";
import { GameIcon } from "./GameIcon";
import { classIcon } from "./meanings";

// A class icon in a round badge, for character cards and headers.
export function ClassBadge({
  characterClass,
  size = "md",
}: {
  characterClass: string;
  size?: "md" | "lg";
}) {
  const icon = classIcon(characterClass);
  if (!icon) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-accent ${
        size === "lg" ? "size-14 p-3" : "size-10 p-2"
      }`}
    >
      <GameIcon name={icon} className="size-full" title={label(characterClass)} />
    </span>
  );
}
