#!/usr/bin/env bash
# Writes .env.development.local from the running local Supabase stack, so
# `pnpm dev` talks to your local database and never to production.
#
# Run `pnpm db:start` first (needs Docker), then `pnpm db:env`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

npx -y supabase@latest status -o json 2>/dev/null | python3 -c '
import json, sys
s = json.load(sys.stdin)
open(".env.development.local", "w").write(f"""# Local Supabase (pnpm db:start). Used by `pnpm dev` only; it overrides
# .env.local in development, so dev never touches production data.
# Regenerate with `pnpm db:env`. Sign-in emails land in Mailpit: {s["MAILPIT_URL"]}
NEXT_PUBLIC_SUPABASE_URL={s["API_URL"]}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY={s["PUBLISHABLE_KEY"]}
SUPABASE_SECRET_KEY={s["SECRET_KEY"]}
""")
print("Wrote .env.development.local. Sign-in emails: " + s["MAILPIT_URL"])
'
