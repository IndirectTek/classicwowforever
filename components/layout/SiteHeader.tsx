import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { site } from "@/lib/site";
import { MobileMenu } from "./MobileMenu";
import { ThemeToggle } from "./ThemeToggle";

type NavLink = { href: string; label: string };

const publicLinks: NavLink[] = [
  { href: "/rested", label: "Rested XP" },
  { href: "/open-source", label: "Open Source" },
];

// The header is static except for the account links, which depend on the
// session. They stream in behind a Suspense boundary, so every page keeps a
// prerendered shell (see "Cache Components" in the Next.js docs).
export function SiteHeader() {
  return (
    <header className="relative border-b border-border">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between gap-2 px-4">
        <Link
          href="/"
          className="font-display whitespace-nowrap text-[15px] font-bold text-text sm:text-xl sm:tracking-wide"
        >
          {site.name}
        </Link>
        <Suspense fallback={<HeaderNav signedIn={null} />}>
          <SessionNav />
        </Suspense>
      </div>
    </header>
  );
}

async function SessionNav() {
  const user = await getCurrentUser();
  return <HeaderNav signedIn={Boolean(user)} />;
}

// signedIn is null while the session is still loading.
function HeaderNav({ signedIn }: { signedIn: boolean | null }) {
  const accountLinks: NavLink[] = signedIn
    ? [
        { href: "/plan", label: "Planner" },
        { href: "/characters", label: "Characters" },
      ]
    : [];
  const links = [...accountLinks, ...publicLinks];

  return (
    <div className="flex items-center gap-1">
      <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={desktopLinkClass}>
            {link.label}
          </Link>
        ))}
        <AccountAction signedIn={signedIn} className={desktopLinkClass} />
      </nav>
      <ThemeToggle />
      <MobileMenu>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={mobileLinkClass}>
            {link.label}
          </Link>
        ))}
        <AccountAction signedIn={signedIn} className={mobileLinkClass} />
      </MobileMenu>
    </div>
  );
}

function AccountAction({ signedIn, className }: { signedIn: boolean | null; className: string }) {
  if (signedIn === null) return null;
  if (!signedIn) {
    return (
      <Link href="/login" className={className}>
        Sign in
      </Link>
    );
  }
  // A POST form, not a link, so prefetching can never sign anyone out.
  return (
    <form action="/auth/signout" method="post">
      <button type="submit" className={`${className} w-full text-left`}>
        Sign out
      </button>
    </form>
  );
}

const desktopLinkClass =
  "whitespace-nowrap rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-surface-raised hover:text-text";
const mobileLinkClass =
  "block rounded-lg px-3 py-3 text-base text-text hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-accent";
