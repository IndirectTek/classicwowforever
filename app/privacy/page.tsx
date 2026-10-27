import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
};

// Plain-language privacy notice for Milestone 1. Revisit when accounts,
// characters, and payments arrive.
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="font-display text-4xl font-bold">Privacy</h1>
      <div className="mt-6 space-y-4 text-text-muted">
        <p>
          <strong className="text-text">Waitlist.</strong> If you join the waitlist we store your
          email address and the date you signed up. We use it to send you one email when the planner
          opens. We don&apos;t sell it or share it.
        </p>
        <p>
          <strong className="text-text">Analytics.</strong> We use Vercel Web Analytics to count
          page views. It doesn&apos;t use cookies or track you across sites.
        </p>
        <p>
          <strong className="text-text">Removal.</strong> To be removed from the waitlist, reply to
          any email from us or write to{" "}
          <a
            href={`mailto:${site.contactEmail}`}
            className="text-accent underline underline-offset-2"
          >
            {site.contactEmail}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
