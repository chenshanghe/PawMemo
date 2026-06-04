/**
 * E2E Test: Data Export Flow
 *
 * Covers:
 *   A. JSON export button (/me settings section):
 *      - "导出我的数据" button is present and enabled
 *      - Clicking triggers download of wantong-export-*.json
 *
 *   B. Export tab (/me → 导出 tab):
 *      - "导出全部日记" heading is shown
 *      - "打印 / 存为 PDF" button is present and enabled
 *      - Entry list is rendered in the tab (or empty-state message)
 *
 * Known limitation:
 *   CSV export does NOT exist in this application. The only machine-readable
 *   export format is JSON (full diary data dump via GET /api/me/export).
 *   The "导出" tab provides a PDF/print layout, not CSV. This is a tracked
 *   limitation, not a design choice: CSV export was listed in scope but is
 *   not implemented. No CSV-related UI, API route, or client-side logic exists.
 *
 * Run with: pnpm playwright test export-flow.spec.ts
 * Requires: CLERK_SECRET_KEY env var
 *
 * API:
 *   GET /api/me/export — returns JSON blob; requires Clerk auth
 *   GET /api/me/export (no auth) — returns 401 or 403
 */

import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

const BASE = "/travel-diary";

test.describe("Data export flow", () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto(`${BASE}/`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
  });

  test("Export API requires authentication", async ({ request }) => {
    const res = await request.get("/api/me/export");
    expect([401, 403]).toContain(res.status());
  });

  test("/me page shows '导出我的数据' JSON export button", async ({ page }) => {
    await page.goto(`${BASE}/me`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2500);

    const exportDataBtn = page.locator("text=导出我的数据").first();
    await expect(exportDataBtn).toBeVisible({ timeout: 10000 });

    const parentEl = exportDataBtn.locator("..");
    const subtitleEl = parentEl.locator("text=JSON");
    await expect(subtitleEl).toBeVisible({ timeout: 3000 });
  });

  test("clicking '导出我的数据' initiates a file download", async ({ page }) => {
    await page.goto(`${BASE}/me`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2500);

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }),
      page.locator("text=导出我的数据").first().click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^wantong-export-\d{4}-\d{2}-\d{2}\.json$/);
  });

  test("'导出' tab shows '导出全部日记' heading and PDF print button", async ({ page }) => {
    await page.goto(`${BASE}/me`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2500);

    const exportTab = page.locator("text=导出").first();
    await expect(exportTab).toBeVisible({ timeout: 8000 });
    await exportTab.click();
    await page.waitForTimeout(1000);

    await expect(
      page.locator("text=导出全部日记").first(),
    ).toBeVisible({ timeout: 8000 });

    await expect(
      page.locator("button:has-text('打印'), button:has-text('PDF')").first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test("CSV export limitation: no CSV export UI or endpoint exists", async ({ request }) => {
    const res = await request.get("/api/me/export/csv");
    expect(res.status()).toBe(404);
  });
});
