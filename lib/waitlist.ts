import { z } from "zod";

export const WaitlistInput = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "That doesn't look like an email address." }).max(254)),
  // Honeypot: hidden from people, but naive bots fill in every field.
  website: z.string().max(0).optional(),
});

export type WaitlistState =
  { status: "idle" } | { status: "success" } | { status: "error"; message: string };

// Postgres error code for a unique constraint violation.
export const UNIQUE_VIOLATION = "23505";
