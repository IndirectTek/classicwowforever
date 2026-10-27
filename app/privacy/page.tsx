import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
};

// Plain-language privacy notice. Revisit when the addon import and payments
// arrive.
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
          <strong className="text-text">Your account.</strong> Signing in stores your email address
          so we can send sign-in links. Characters you add (name, realm, race, class, level, zone)
          are visible only to you. Delete a character and everything tied to it is deleted with it.
        </p>
        <p>
          <strong className="text-text">Quest reports.</strong> When you report a quest we store it
          with your account, so you can see and withdraw it. If a data keeper adds it to our open
          game data, the quest details and the name you chose to be credited as (or
          &ldquo;community&rdquo;) become public under CC BY-SA. Your email address never does.
        </p>
        <p>
          <strong className="text-text">Cookies.</strong> Signing in sets a cookie that keeps you
          signed in. We don&apos;t use advertising or tracking cookies.
        </p>
        <p>
          <strong className="text-text">Analytics.</strong> We use Vercel Web Analytics to count
          page views. It doesn&apos;t use cookies or track you across sites.
        </p>
        <p>
          <strong className="text-text">Removal.</strong> To be removed from the waitlist or to
          delete your account, reply to any email from us or write to{" "}
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
