// An icon from game-icons.net (CC BY 3.0, credited on /open-source). Like a
// Rails view helper (`icon_tag :shield`): pass a name, get inline SVG in the
// current text color. Decorative by default; give it a `title` when the icon
// is the only thing saying what something is.
import { gameIcons, type GameIconName } from "./gameIcons";

type Props = {
  name: GameIconName;
  className?: string;
  title?: string;
};

export function GameIcon({ name, className = "size-5", title }: Props) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="currentColor"
      className={`shrink-0 ${className}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {gameIcons[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
