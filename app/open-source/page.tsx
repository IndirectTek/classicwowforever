import type { Metadata } from "next";
import { GameIcon } from "@/components/icons/GameIcon";
import {
  gameIcons,
  iconArtists,
  iconCredits,
  type GameIconName,
} from "@/components/icons/gameIcons";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Open Source",
  description: "What's open, how it's licensed, and how to contribute or self host.",
};

const licenses = [
  [
    "Web app",
    "AGPL 3.0",
    "Self host or modify freely; a competing hosted version must publish its changes.",
  ],
  [
    "Exporter addon",
    "MIT",
    "Arrives in Iteration 2. Free and readable, as Blizzard's addon policy requires.",
  ],
  ["Import parser", "MIT", "Small and reusable by other addon and tool authors."],
  ["Quest and zone data", "CC BY SA 4.0", "Contributed data stays open and credited."],
  ["Icons", "CC BY 3.0", "By the artists of game-icons.net, credited below."],
];

// Every icon on the site, grouped by the artist who drew it (CC BY asks
// for credit). Built from the generated icon list, so it's never out of date.
const iconsByArtist = Object.entries(
  (Object.keys(gameIcons) as GameIconName[]).reduce<Record<string, GameIconName[]>>(
    (byArtist, icon) => {
      (byArtist[iconCredits[icon]] ??= []).push(icon);
      return byArtist;
    },
    {},
  ),
) as [keyof typeof iconArtists, GameIconName[]][];

export default function OpenSourcePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="font-display text-4xl font-bold">Open Source</h1>
      <p className="mt-4 text-lg text-text-muted">
        All of the code and game data behind {site.name} are public. The hosted version at{" "}
        classicwowforever.dev pays for the servers and the AI.
      </p>

      <h2 className="mt-12 text-2xl font-semibold">Licenses</h2>
      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-text-muted">
            <tr>
              <th scope="col" className="p-3 font-medium">
                Part
              </th>
              <th scope="col" className="p-3 font-medium">
                License
              </th>
              <th scope="col" className="hidden p-3 font-medium sm:table-cell">
                Why
              </th>
            </tr>
          </thead>
          <tbody>
            {licenses.map(([part, license, why]) => (
              <tr key={part} className="border-t border-border">
                <td className="p-3">{part}</td>
                <td className="p-3 font-mono">{license}</td>
                <td className="hidden p-3 text-text-muted sm:table-cell">{why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 text-2xl font-semibold">Icons</h2>
      <p className="mt-3 text-text-muted">
        The icons are from{" "}
        <a href="https://game-icons.net" className="text-accent underline underline-offset-2">
          game-icons.net
        </a>
        , used under{" "}
        <a
          href="https://creativecommons.org/licenses/by/3.0/"
          className="text-accent underline underline-offset-2"
        >
          CC BY 3.0
        </a>
        . None of the site&apos;s art comes from the game.
      </p>
      <ul className="mt-4 space-y-4">
        {iconsByArtist.map(([artist, icons]) => (
          <li key={artist}>
            <p>
              By{" "}
              <a
                href={iconArtists[artist].url}
                className="text-accent underline underline-offset-2"
              >
                {iconArtists[artist].name}
              </a>
              :
            </p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-text-muted">
              {icons.map((icon) => (
                <span key={icon} className="inline-flex items-center gap-1.5">
                  <GameIcon name={icon} className="size-5 text-accent" />
                  {icon.replace(/-/g, " ")}
                </span>
              ))}
            </p>
          </li>
        ))}
      </ul>

      <h2 className="mt-12 text-2xl font-semibold">Contribute</h2>
      <p className="mt-3 text-text-muted">
        You don&apos;t need to write code. Accurate quest data matters as much as good code, and
        playing the game is how we get it. If you do code, look for issues labeled{" "}
        <code className="font-mono text-text">good first issue</code>.
      </p>
      <a
        href={`${site.githubUrl}/blob/main/CONTRIBUTING.md`}
        className="mt-3 inline-block font-medium text-accent hover:underline"
      >
        Read the contributing guide →
      </a>

      <h2 className="mt-12 text-2xl font-semibold">Self host</h2>
      <p className="mt-3 text-text-muted">
        You&apos;ll need Node.js, pnpm, a free Supabase project, and your own Claude API key. The
        README walks through setup. Don&apos;t want to run Postgres and pay for inference? Use the
        hosted version.
      </p>
      <a
        href={site.githubUrl}
        className="mt-3 inline-block font-medium text-accent hover:underline"
      >
        View the repository →
      </a>
    </div>
  );
}
