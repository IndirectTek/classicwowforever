import Link from "next/link";
import { site } from "@/lib/site";
import { ThemeToggle } from "./ThemeToggle";

// Planner and Characters join the nav (with a mobile menu) when Milestones 2
// and 3 ship; linking to pages that don't exist yet would just be 404s. On
// phones, Rested XP is linked from the home page and footer instead.
export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between gap-2 px-4">
        <Link
          href="/"
          className="font-display whitespace-nowrap text-[15px] font-bold text-text sm:text-xl sm:tracking-wide"
        >
          {site.name}
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/rested"
            className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-surface-raised hover:text-text sm:inline-block"
          >
            Rested XP
          </Link>
          <Link
            href="/open-source"
            className="whitespace-nowrap rounded-lg px-2 py-2 max-[359px]:hidden sm:px-3 text-sm text-text-muted hover:bg-surface-raised hover:text-text"
          >
            Open Source
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
