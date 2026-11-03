import { GameIcon } from "@/components/icons/GameIcon";
import type { GameIconName } from "@/components/icons/gameIcons";

// A thin rule with an icon in the middle, like the dividers in an old
// adventurer's journal. Purely decorative.
export function Flourish({
  icon = "crossed-swords",
  className = "",
}: {
  icon?: GameIconName;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={`flex items-center gap-4 text-accent ${className}`}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
      <GameIcon name={icon} className="size-5" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
    </div>
  );
}
