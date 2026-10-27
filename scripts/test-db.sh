#!/usr/bin/env bash
# Applies every migration and the seed to a throwaway database, then runs
# supabase/tests/rls_and_quota.sql against it.
#
# Needs any Postgres 15+ you can create databases on (a local install or a
# Docker container works; not your Supabase project). Point TEST_DATABASE_URL
# at its maintenance database, for example:
#   TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5432/postgres pnpm test:db
#
# It creates (and recreates) a database named cwf_test and the roles anon,
# authenticated and service_role on that server.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
URL="${TEST_DATABASE_URL:?Set TEST_DATABASE_URL to a throwaway Postgres server}"
TEST_URL="${URL%/*}/cwf_test"
psql_admin() { psql "$URL" -v ON_ERROR_STOP=1 -q "$@"; }
psql_test() { psql "$TEST_URL" -v ON_ERROR_STOP=1 -q "$@"; }

psql_admin -c "drop database if exists cwf_test"
for role in anon authenticated service_role; do
  psql_admin -c "drop role if exists $role" >/dev/null 2>&1 || true
done
psql_admin -c "create database cwf_test"

psql_test -f "$ROOT/supabase/tests/00_supabase_stub.sql"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  echo "migrate: $(basename "$migration")"
  psql_test -f "$migration"
done
psql_test -f "$ROOT/supabase/seed.sql"
psql_test -f "$ROOT/supabase/tests/rls_and_quota.sql" >/dev/null
echo "All database tests passed."
