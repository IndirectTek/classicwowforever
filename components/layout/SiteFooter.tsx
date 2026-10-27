import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-3 px-4 py-8 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>{site.disclaimer}</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/rested" className="hover:text-text">
            Rested XP
          </Link>
          <Link href="/open-source" className="hover:text-text">
            Open Source
          </Link>
          <a href={site.githubUrl} className="hover:text-text">
            GitHub
          </a>
          <Link href="/privacy" className="hover:text-text">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
