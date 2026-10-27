"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

// Uses the phone's share sheet where there is one, otherwise copies the link.
export function ShareButton({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // Closing the share sheet isn't an error worth reporting.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <Button variant="secondary" onClick={share}>
      <span aria-live="polite">{copied ? "Link copied" : "Share plan"}</span>
    </Button>
  );
}
