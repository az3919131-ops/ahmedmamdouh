#!/usr/bin/env bash
# يختبر store/supabase/schema.sql على PostgreSQL محلي (RLS + الدوال + الصلاحيات) بمحاكاة أدوار Supabase.
# Tests schema.sql on a local PostgreSQL using stubbed Supabase roles. Needs a SUPERUSER connection URL.
#
#   TEST_DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/postgres npm run test:db
#
# Project manager · Eng. Ahmed Zahran
set -euo pipefail
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ADMIN_URL="${TEST_DATABASE_URL:-postgresql://iltizam:iltizam@127.0.0.1:5432/postgres}"
DB="zs_schema_test_$$"

# رابط قاعدة الاختبار: نفس الخادم باسم قاعدة جديد
TEST_URL="$(printf '%s' "$ADMIN_URL" | sed -E "s#(postgres(ql)?://[^/]+)/[^?]*#\1/$DB#")"

cleanup() { psql "$ADMIN_URL" -q -c "drop database if exists \"$DB\"" >/dev/null 2>&1 || true; }
trap cleanup EXIT

psql "$ADMIN_URL" -q -v ON_ERROR_STOP=1 -c "create database \"$DB\""

run() { psql "$TEST_URL" -q -v ON_ERROR_STOP=1 "$@"; }

run -f "$HERE/supabase/tests/supabase-stubs.sql"
echo "▸ schema.sql (first run)";  run -f "$HERE/supabase/schema.sql" >/dev/null
echo "▸ schema.sql (re-run: must be idempotent)"; run -f "$HERE/supabase/schema.sql" >/dev/null
echo "▸ security tests";          run -f "$HERE/supabase/tests/security.test.sql"
