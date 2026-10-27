"use client";

import { useEffect, useId, useState } from "react";

// The phone-sized menu: a button that shows the nav links in a panel under
// the header. Closes when you pick a link, press Escape, or go back/forward.
// (It deliberately avoids usePathname(), which would make the header dynamic.)
export function MobileMenu({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const id = useId();

  useEffect(() => {
    if (!isOpen) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    window.addEventListener("popstate", close);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", close);
    };
  }, [isOpen]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={id}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        onClick={() => setOpen(!isOpen)}
        className="inline-flex size-11 items-center justify-center rounded-lg text-text-muted hover:bg-surface-raised hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {isOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      <nav
        id={id}
        aria-label="Main"
        hidden={!isOpen}
        // Clicking any link or button inside closes the menu.
        onClick={(e) => (e.target as HTMLElement).closest("a, button") && setOpen(false)}
        className="absolute inset-x-0 top-16 z-20 border-b border-border bg-surface px-4 py-2 shadow-sm"
      >
        {children}
      </nav>
    </div>
  );
}
