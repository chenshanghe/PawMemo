#!/bin/bash
set -e
pnpm install --frozen-lockfile

# Clean up any orphaned diary_entries rows that have no user_id.
# These cause drizzle-kit push to fail when enforcing the NOT NULL constraint.
node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() =>
  client.query(\"DELETE FROM diary_entries WHERE user_id IS NULL\")
).then(r => {
  if (r.rowCount > 0) console.log('Cleaned up ' + r.rowCount + ' orphaned diary_entries row(s).');
  return client.end();
}).catch(err => {
  // Table may not exist yet on first deploy — that's fine
  console.warn('Pre-migration cleanup skipped:', err.message);
  return client.end();
});
"

pnpm --filter db push
