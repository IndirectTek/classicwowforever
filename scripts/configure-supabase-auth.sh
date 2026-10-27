#!/usr/bin/env bash
# Applies our Supabase Auth email settings through the Supabase Management API:
# Postmark SMTP, the magic link and signup emails, the email rate limit, and
# the allowed redirect URLs. Safe to re-run; it sets the same values each time.
#
# Reads from .env.local:
#   SUPABASE_URL            https://<project-ref>.supabase.co
#   POSTMARK_API_KEY        Postmark server API token (used as SMTP user and password)
#   SUPABASE_ACCESS_TOKEN   personal access token (or SUPABASE_PERSONAL_ACCESS_TOKEN) from
#                           https://supabase.com/dashboard/account/tokens
#
# Usage:
#   bash scripts/configure-supabase-auth.sh --dry-run   # show the payload, secrets hidden
#   bash scripts/configure-supabase-auth.sh             # apply it
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
set -a
# shellcheck disable=SC1091
. "$ROOT/.env.local"
set +a

: "${SUPABASE_URL:?missing from .env.local}"
: "${POSTMARK_API_KEY:?missing from .env.local}"
REF="$(printf '%s' "$SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co.*|\1|')"

export TEMPLATE_FILE="$ROOT/supabase/templates/magic-link.html"
PAYLOAD="$(python3 - <<'EOF'
import json, os, re

# Drop the leading HTML comment (notes for us, not for recipients).
template = re.sub(r"^\s*<!--.*?-->\s*", "", open(os.environ["TEMPLATE_FILE"]).read(), flags=re.S)
subject = "Your sign-in link for Classic WoW Forever"

print(json.dumps({
    "site_url": "https://classicwowforever.dev",
    "uri_allow_list": ",".join([
        "https://classicwowforever.dev/**",
        "https://classicwowforever-*-codetalkers.vercel.app/**",
        "http://localhost:3000/**",
    ]),
    "external_email_enabled": True,
    "smtp_admin_email": "hello@classicwowforever.dev",
    "smtp_sender_name": "Classic WoW Forever",
    "smtp_host": "smtp.postmarkapp.com",
    "smtp_port": "587",  # the API wants a string here
    "smtp_user": os.environ["POSTMARK_API_KEY"],
    "smtp_pass": os.environ["POSTMARK_API_KEY"],
    "rate_limit_email_sent": 100,
    # New users get the "confirm signup" email and returning users the
    # "magic link" email; both should look and work the same.
    "mailer_subjects_magic_link": subject,
    "mailer_templates_magic_link_content": template,
    "mailer_subjects_confirmation": subject,
    "mailer_templates_confirmation_content": template,
}))
EOF
)"

if [[ "${1:-}" == "--dry-run" ]]; then
  echo "Project: $REF"
  printf '%s' "$PAYLOAD" | python3 -c '
import json, sys
p = json.load(sys.stdin)
for k in ("smtp_user", "smtp_pass"):
    p[k] = "<hidden, %d chars>" % len(p[k])
for k in ("mailer_templates_magic_link_content", "mailer_templates_confirmation_content"):
    p[k] = "<template, %d chars>" % len(p[k])
print(json.dumps(p, indent=2))'
  exit 0
fi

SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-${SUPABASE_PERSONAL_ACCESS_TOKEN:-}}"
: "${SUPABASE_ACCESS_TOKEN:?add a personal access token to .env.local first}"
RESPONSE="$(printf '%s' "$PAYLOAD" | curl -sS -X PATCH \
  "https://api.supabase.com/v1/projects/$REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @-)"

# Print only non-secret fields so we can confirm what was saved.
printf '%s' "$RESPONSE" | python3 -c '
import json, sys
r = json.load(sys.stdin)
if "message" in r and "smtp_host" not in r:
    sys.exit("Supabase API error: " + str(r["message"]))
for k in ("site_url", "uri_allow_list", "smtp_host", "smtp_port", "smtp_admin_email",
          "smtp_sender_name", "rate_limit_email_sent", "mailer_subjects_magic_link"):
    print(f"{k}: {r.get(k)}")
print("smtp_pass set:", bool(r.get("smtp_pass")))'
