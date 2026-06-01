# Threat Model

## Project Overview

This project is a travel-diary application with a public web frontend (`artifacts/travel-diary`) and an Express API (`artifacts/api-server`) backed by PostgreSQL via Drizzle. Users authenticate with Clerk, create private or public travel entries, upload photos and avatars through object storage, share entries publicly, interact socially (likes, comments, follows, favorites), and can upgrade subscriptions through an Alipay-based payment flow. Production is assumed to run with `NODE_ENV=production` on a public Replit autoscale deployment.

## Assets

- **User accounts and sessions** — Clerk-backed identities and session cookies. Compromise enables account takeover and access to all private diary content for that user.
- **Private diary content** — entry text, destinations, travel dates, moods, companions, and attached photos. This is the application’s most sensitive user data because entries default to private.
- **Public social data** — public entries, comments, likes, follows, and author profiles. Integrity matters because unauthorized interaction can spam users or corrupt engagement signals.
- **Stored media objects** — uploaded avatars and entry photos stored in object storage. These can contain sensitive or unpublished user content before a user intentionally shares it.
- **Subscription state and payment records** — subscription tier, expiry, order status, and payment references. Tampering can grant paid features without payment.
- **Application secrets and API keys** — database URL, Clerk secret key, DeepSeek API key, Resend key, Alipay keys, and object-storage signing access through the Replit sidecar.

## Trust Boundaries

- **Browser to API** — all frontend requests to `/api/*`. The browser is untrusted; every sensitive route must enforce authentication, authorization, and input validation server-side.
- **API to PostgreSQL** — the API has broad access to application data. Authorization mistakes or injection here can expose or modify all diary, social, and subscription data.
- **API to object storage** — the API issues upload URLs and serves stored objects. It must prevent private objects from being exposed through guessable paths or weak ACL handling.
- **Public to authenticated surfaces** — public routes such as health checks, geocode/weather helpers, public square pages, and share links coexist with private diary and profile endpoints. The boundary must be explicit per route.
- **Authenticated user to other users’ content** — the app supports social features and public sharing, so ownership and visibility checks must separate a viewer’s own private entries from another user’s private entries.
- **API to external services** — Clerk proxying, OpenStreetMap geocoding, Open-Meteo weather, DeepSeek, Resend, and Alipay all cross external trust boundaries and must not be exposed through unsafe proxying or insecure fallback logic.
- **Development-only to production** — the mockup sandbox is assumed not to be deployed to production and should normally be excluded unless future scans find production reachability.

## Scan Anchors

- **Production entry points:** `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/**/*.ts`, `artifacts/travel-diary/src/**/*`.
- **Highest-risk areas:** object storage routes/services, social/share routes, payment routes, and any route that mixes public and private entry access.
- **Public surfaces:** `/api/health`, `/api/geocode`, `/api/weather`, `/api/square`, `/api/share/:token`, `/api/entries/:id/public`, and storage routes that intentionally expose objects.
- **Authenticated surfaces:** `/api/entries`, `/api/photos`, `/api/stats`, `/api/ai`, `/api/me/*`, `/api/pay/alipay/*`, upload-url endpoints, follow/favorite endpoints.
- **Dev-only areas to usually ignore:** `artifacts/mockup-sandbox/**` unless deployment/routing evidence shows production exposure.

## Threat Categories

### Spoofing

Authentication depends on Clerk session handling in Express middleware. Protected routes must derive identity only from validated Clerk auth state, and public routes that optionally read auth state must not accidentally grant authenticated-only behavior when identity is absent or forged. Clerk proxying must preserve the correct public host and avoid exposing secrets to unintended upstreams.

### Tampering

Users can create entries, attach media, interact socially, and upgrade subscriptions. The API must compute authorization and business rules server-side: only entry owners should modify private content, only authorized users should attach media to an entry, and subscription state must only change after verified payment events. Any mock or sandbox payment path must be disabled outside true development/test contexts.

### Information Disclosure

Private diary entries and uploaded photos are sensitive by default. The system must ensure that private entries, private media objects, and interaction metadata attached to private entries are not retrievable through predictable IDs, direct storage URLs, share-link side channels, or public helper endpoints. Visibility changes on an entry must also revoke or re-protect any previously exposed media URLs; changing a database visibility flag alone is not sufficient. Logs and error responses must avoid leaking secrets, session material, or internal details.

### Denial of Service

Public helpers and streaming AI endpoints can consume external-service or server resources. Public or lightly protected endpoints should bound request sizes, query fan-out, stream duration, and external-call timeouts so unauthenticated or low-cost authenticated requests cannot disproportionately consume resources.

### Elevation of Privilege

The main privilege boundaries are between unauthenticated visitors, authenticated users, and the owners of private entries/media. The API must enforce per-object ownership and visibility checks for every route that accepts an entry ID, share token, object path, or order identifier. Predictable numeric IDs and direct object paths must never be enough to read or influence another user’s private resources, and auxiliary routes such as likes, comments, storage fetches, and payment helpers must reuse the same authorization rules as the primary content-detail flows.