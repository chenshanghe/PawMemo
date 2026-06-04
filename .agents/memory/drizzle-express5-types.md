---
name: Drizzle + Express 5 type gotchas
description: Three recurring TypeScript issues when using Drizzle ORM with Express 5 and Zod schemas in this project.
---

## Rule 1 — zod.coerce.date() returns Date, Drizzle date() expects string

`zod.coerce.date()` in api-zod schemas produces `Date` objects, but Drizzle's `date()` column type expects an ISO date string for `.values()`.

**Fix:** Convert before insert:
```typescript
startDate: data.startDate instanceof Date ? data.startDate.toISOString().split("T")[0] : data.startDate
```

**Why:** Drizzle maps `date()` columns to ISO strings at the TypeScript level; runtime Postgres accepts both but the TS overload requires `string | SQL | Placeholder`.

**How to apply:** Any route that inserts/updates a Drizzle `date()` column with a value from Zod must do the `instanceof Date` conversion.

---

## Rule 2 — req.params values are string|string[] in Express 5 types

In `@types/express@5.x`, `req.params[key]` resolves to `string | string[]` when the router doesn't carry explicit type parameters.

**Fix:** Cast explicitly:
```typescript
const blockedId = req.params.userId as string;
```

**Why:** Path params are always `string` at runtime (Express never produces array for `:param` segments), but the TypeScript type is widened. Drizzle's `eq()` overloads require `string | SQLWrapper`, rejecting `string | string[]`.

**How to apply:** Every `req.params.xxx` that flows into a Drizzle query or comparison must be cast `as string`.

---

## Rule 3 — Inline object literals trigger false-positive TS2769 on Drizzle .values()

Passing a large object literal directly to `db.insert(table).values({...})` can produce a misleading TS2769 "No overload matches" error when TypeScript picks the wrong overload to show. The actual cause is usually a type mismatch on one field (masked by overload printing).

**Fix:** Extract to a named variable first:
```typescript
const insertData = { userId, title: data.title, ... };
const [row] = await db.insert(table).values(insertData).returning();
```

**Why:** Named variables bypass TypeScript's "excess property check" on object literals, and the error message from overload resolution becomes clearer about which field actually fails.

**How to apply:** When TS2769 appears on a `.values({...})` call, move the object to a named const and re-run tsc to get the real error.

---

## Rule 4 — AuthedRequest requires double cast in Express 5

`(req as AuthedRequest).userId` fails in Express 5 because `Request` and `AuthedRequest extends Request` types no longer overlap due to stricter generic constraints.

**Fix:** `(req as unknown as AuthedRequest).userId`

**Why:** Express 5 `Request<P,R,B,Q>` has tighter constraints; a direct cast from `Request` to `AuthedRequest` fails. The `unknown` intermediate cast bypasses the check.
