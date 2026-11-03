// Home page: a Server Component by default (rendered on the server like an ERB
// view). Only the prompt, the countdown and the waitlist form ship JavaScript.
import Link from "next/link";
import { Countdown } from "@/components/countdown/Countdown";
import { GameIcon } from "@/components/icons/GameIcon";
import type { GameIconName } from "@/components/icons/gameIcons";
import { SessionPrompt } from "@/components/home/SessionPrompt";
import { Flourish } from "@/components/ui/Flourish";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { site } from "@/lib/site";
import { getZones } from "@/lib/zones";

const steps: { icon: GameIconName; title: string; body: string }[] = [
  {
    icon: "hourglass",
    title: "Tell us your time",
    body: "One line is enough: your character, how many minutes you have tonight, and what you're after: XP, gold, gear, a dungeon, or a relaxed evening.",
  },
  {
    icon: "scroll-unfurled",
    title: "Get a plan",
    body: "A short, ordered checklist with a time budget for each step, sized to the time you actually have.",
  },
  {
    icon: "beer-stein",
    title: "Log out rested",
    body: "Every plan ends at an inn or a city, so tomorrow's session starts with rested XP.",
  },
];

const tools: { icon: GameIconName; href: string; title: string; body: string }[] = [
  {
    icon: "spell-book",
    href: "/p/example",
    title: "See an example plan",
    body: "Start the session timer, check off steps, and watch it nudge you toward the inn when time runs low.",
  },
  {
    icon: "night-sleep",
    href: "/rested",
    title: "Rested XP calculator",
    body: "Logging out now? See how much rested XP you'll have tomorrow, or in three days.",
  },
  {
    icon: "quill-ink",
    href: "/report",
    title: "Report a quest",
    body: "Playing Classic Era until launch? Tell us about the quests you play. We'll check them in WoW Forever and credit you in our open data.",
  },
];

export default async function Home() {
  // Cached (see lib/zones.ts), so the page still prerenders.
  const zones = await getZones();

  return (
    <>
      <section className="relative mx-auto max-w-[1120px] px-4 pb-16 pt-12 sm:pt-20">
        {/* A faint campfire behind the headline, on wide screens only. */}
        <GameIcon
          name="campfire"
          className="pointer-events-none absolute -top-4 right-0 -z-10 hidden size-96 text-accent opacity-[0.06] lg:block"
        />
        <p className="mb-3 text-sm uppercase tracking-[0.2em] text-accent">
          For World of Warcraft: Forever
        </p>
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-6xl">
          Make tonight&apos;s session count
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-text-muted">
          You have 75 minutes, not all night. Tell us your character and your time, and get a plan
          that fits, ending somewhere you&apos;ll log out rested.
        </p>

        <div className="mt-8">
          <SessionPrompt zones={zones.map(({ id, name }) => ({ id, name }))} />
        </div>

        <div className="mt-10">
          <Countdown />
        </div>

        <div id="waitlist" className="mt-10 scroll-mt-8">
          <WaitlistForm />
        </div>
      </section>

      <section aria-labelledby="how-it-works" className="mx-auto max-w-[1120px] px-4 pb-16">
        <Flourish className="mb-12" />
        <h2 id="how-it-works" className="font-display mb-6 text-3xl font-bold">
          How it works
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="rounded-lg border border-border bg-surface p-6">
              <div className="flex items-center justify-between">
                <GameIcon name={step.icon} className="size-10 text-accent" />
                <span className="font-mono text-sm text-text-muted">0{i + 1}</span>
              </div>
              <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="while-you-wait" className="mx-auto max-w-[1120px] px-4 pb-16">
        <Flourish icon="campfire" className="mb-12" />
        <h2 id="while-you-wait" className="font-display mb-6 text-3xl font-bold">
          While you wait
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group rounded-lg border border-border bg-surface p-6 hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
            >
              <GameIcon name={tool.icon} className="mb-3 size-8 text-accent" />
              <h3 className="text-xl font-semibold group-hover:text-accent">{tool.title} →</h3>
              <p className="mt-2 text-text-muted">{tool.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-text-muted">
            Open source under AGPL 3.0. Run it yourself with your own Supabase project and Claude
            API key, or use the hosted version here.
          </p>
          <a href={site.githubUrl} className="font-medium text-accent hover:underline">
            View on GitHub →
          </a>
        </div>
      </section>
    </>
  );
}
