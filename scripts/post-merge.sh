#!/bin/bash
set -e
pnpm install --frozen-lockfile

# Clean up orphaned diary_entries rows (user_id IS NULL) before drizzle-kit
# push so the NOT NULL constraint migration can apply without conflicts.
psql "$DATABASE_URL" -c "DELETE FROM diary_entries WHERE user_id IS NULL;" \
  2>/dev/null && echo "Pre-migration cleanup done." \
  || echo "Pre-migration cleanup skipped (table may not exist yet)."

pnpm --filter db push
