/**
 * Global setup for Playwright tests.
 *
 * Handles Clerk testing token setup so that authenticated tests can use
 * setupClerkTestingToken() to inject session state into the browser.
 *
 * Requires:
 *   CLERK_SECRET_KEY — Clerk secret key (set via environment variable)
 *   PLAYWRIGHT_BASE_URL — App URL (default: http://localhost:18469)
 */
import { clerkSetup } from "@clerk/testing/playwright";
import { FullConfig } from "@playwright/test";

export default async function globalSetup(_config: FullConfig) {
  await clerkSetup();
}
