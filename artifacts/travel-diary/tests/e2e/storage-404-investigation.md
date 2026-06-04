# Storage 404 Root-Cause Investigation

**Date**: 2026-06-04  
**Route**: `GET /api/storage/objects/:path`  
**File**: `artifacts/api-server/src/routes/storage.ts` (lines 139–244)

---

## Symptom

`GET /api/storage/objects/uploads/<id>` returns **HTTP 404** when called
immediately after a file upload but before the diary entry containing that
photo is saved to the database.

---

## Root Cause

The storage route implements a **database-reference ACL check** before serving
any private object. The check works as follows:

```
Request: GET /storage/objects/<wildcardPath>
  ↓
storedUrl = "/api/storage/objects/<wildcardPath>"
  ↓
Query 1: SELECT entryId FROM photosTable WHERE url = storedUrl
Query 2: SELECT id FROM diaryEntriesTable WHERE coverImage = storedUrl
  ↓
entryIds = union of results
  ↓
if entryIds.length === 0:
  Query 3: SELECT userId FROM userProfilesTable WHERE avatar = storedUrl
  if no row → HTTP 404 "Object not found"   ← THIS IS THE 404
  if found  → serve file (avatar, public)
else:
  check visibility (owner / public / shareToken) for every owning entry
  → HTTP 403 if access denied
  → serve file if access granted
```

**The 404 fires in step "if no row"** because immediately after upload but
before the entry is saved, **no database record references the uploaded URL**.

---

## Is This a Bug?

**No. This is intentional fail-closed security design.**

The ACL model ensures:
- Only objects referenced by known database entities (photos, cover images,
  avatars) can be served
- Objects that exist in the object store but are not associated with any
  diary entry are inaccessible
- This prevents access to orphaned uploads, temporary files, or objects
  uploaded by a different user that haven't been committed to a diary entry

---

## How the Frontend Handles This

The frontend **never calls** `GET /storage/objects/...` for photos that have
not yet been saved to a diary entry:

1. User selects a photo file in the entry form
2. Frontend calls `POST /storage/uploads/request-url` → gets `{ uploadURL, objectPath }`
3. Frontend uploads file directly to object storage via `PUT <uploadURL>`
4. Frontend creates a **blob URL** (`URL.createObjectURL(file)`) for in-UI preview
5. User fills in title, destination, etc. and clicks "发布日记"
6. Backend creates the diary entry with `coverImage = "/api/storage/objects/<objectPath>"`
7. Backend inserts photo row with `url = "/api/storage/objects/<objectPath>"`
8. **Now** the object is referenced in the DB → storage ACL passes → HTTP 200

The blob URL (`blob:https://...`) is used for all pre-save photo rendering;
the API URL is only used after the entry exists in the database.

---

## ACL Permission Matrix

| Object Type | Access Condition |
|-------------|-----------------|
| Photo (photosTable) | Entry owner, or entry visibility=public, or valid shareToken |
| Cover image (diaryEntriesTable.coverImage) | Same as above |
| Avatar (userProfilesTable.avatar) | Public — no auth required |
| Unreferenced object | **404 — denied (fail closed)** |

---

## Verdict

**Root cause identified. No code fix required.**

The 404 is expected behavior, correctly implemented, and already handled by
the frontend via blob URLs. The security model is sound: any object not
associated with a known database record is inaccessible.

---

## Evidence

- `artifacts/api-server/src/routes/storage.ts` lines 139–221: full ACL logic
- `artifacts/travel-diary/src/pages/me.tsx` lines 219–234: avatar upload uses
  blob URL chain (`URL.createObjectURL` not used; objectPath saved immediately
  after upload, then PATCH to profile)
- `artifacts/travel-diary/src/pages/entry-form.tsx`: photo preview uses
  `URL.createObjectURL(file)` for display before entry save
