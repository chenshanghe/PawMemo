---
name: Duplicate Express routes silently shadow fixes
description: Adding a fixed/improved route below an existing one for the same path has zero effect — Express uses the first match.
---

## Rule
Before adding or replacing an Express route, grep the router file for the method+path to confirm no duplicate already exists.

**Why:** When a "fix" route was added below an existing route for `GET /tier-config`, the old route (no fallback, returned `[]` on empty DB) always won. The new route with fallback was never reached. The bug appeared unfixable across multiple deploys because the root cause (duplicate) was never spotted.

**How to apply:** Before writing `router.get("/foo", ...)`, run:
```
grep -n 'router\.get.*"/foo"' src/routes/admin.ts
```
If a match exists, edit that handler in place instead of appending a new one.
