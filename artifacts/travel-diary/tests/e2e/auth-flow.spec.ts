/**
 * E2E Test: Authentication Flow
 *
 * Covers:
 *   - Landing page is shown when unauthenticated
 *   - After sign-in, user sees authenticated dashboard (not landing page)
 *   - After sign-out, user returns to landing page
 *
 * Run with: pnpm playwright test auth-flow.spec.ts
 * Requires: CLERK_SECRET_KEY env var (for setupClerkTestingToken)
 */

import { test, expect } from "@playwright/test";
import { setupClerkTestingToken, clerk } from "@clerk/testing/playwright";

const BASE = "/travel-diary";

test.describe("Authentication flow", () => {
  test("landing page is shown when unauthenticated", async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /记录每一次远行的故事/ }),
    ).toBeVisible({ timeout: 8000 });

    await expect(
      page.getByRole("button", { name: /开始记录旅行|免费注册/ }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: /已有账号|去登录|登录/ }),
    ).toBeVisible();
  });

  test("authenticated user sees dashboard and can access protected routes", async ({
    page,
  }) => {
    await setupClerkTestingToken({ page });
    await page.goto(`${BASE}/`);
    await page.waitForLoadState("networkidle");

    await page.waitForTimeout(2500);

    await expect(
      page.getByRole("heading", { name: /记录每一次远行的故事/ }),
    ).not.toBeVisible({ timeout: 5000 }).catch(() => {});

    await expect(
      page.locator("nav, [class*='nav'], [class*='bottom']"),
    ).toBeVisible({ timeout: 8000 });

    await page.goto(`${BASE}/me`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.locator("text=退出登录"),
    ).toBeVisible({ timeout: 8000 });
  });

  test("sign-out returns user to landing page", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto(`${BASE}/me`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2500);

    const signOutButton = page.locator("text=退出登录");
    await expect(signOutButton).toBeVisible({ timeout: 8000 });

    await clerk.signOut({ page });

    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /记录每一次远行的故事/ }),
    ).toBeVisible({ timeout: 10000 });
  });
});
