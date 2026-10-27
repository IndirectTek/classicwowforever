export const DEFAULT_AFTER_SIGN_IN = "/characters";

// Where to land after the email link is clicked. The email's link always
// says /characters, so a different destination rides along in a short-lived
// cookie. (Open the link on another device and you land on /characters.)
export const AFTER_SIGN_IN_COOKIE = "cwf-after-sign-in";

// Only allow redirects to paths on this site. "//evil.example" and
// "/\evil.example" are treated by browsers as other hosts, so reject them too.
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return DEFAULT_AFTER_SIGN_IN;
  }
  return next;
}
