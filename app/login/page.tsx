import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/safeNext";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <h1 className="font-display text-4xl font-bold">Sign in</h1>
      <p className="mt-3 text-text-muted">
        We&apos;ll email you a link. Tap it and you&apos;re in.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
      {/* Streams in after the form: sends signed-in visitors straight on. */}
      <Suspense fallback={null}>
        <RedirectIfSignedIn searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function RedirectIfSignedIn({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  if (await getCurrentUser()) {
    redirect(safeNextPath(typeof params.next === "string" ? params.next : null));
  }
  return null;
}
