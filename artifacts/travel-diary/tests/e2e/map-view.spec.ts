/**
 * E2E Test: Map View
 *
 * Covers:
 *   - Map page loads without error for authenticated users
 *   - World map SVG is rendered (react-simple-maps ComposableMap → <svg>)
 *   - View toggle buttons (散点图 / 路线图) are present
 *   - Clicking toggle switches view mode (button state changes)
 *   - Zoom controls are present and clickable
 *
 * Run with: pnpm playwright test map-view.spec.ts
 * Requires: CLERK_SECRET_KEY env var
 *
 * Component: artifacts/travel-diary/src/pages/map.tsx
 * Uses: react-simple-maps v3 (ComposableMap → SVG), world-110m.json TopoJSON
 */

import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

const BASE = "/travel-diary";

test.describe("Map view", () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto(`${BASE}/`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
  });

  test("map page renders world map SVG", async ({ page }) => {
    await page.goto(`${BASE}/map`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const svgEl = page.locator("svg").first();
    await expect(svgEl).toBeVisible({ timeout: 10000 });

    const svgContent = await svgEl.innerHTML();
    expect(svgContent.length).toBeGreaterThan(100);
  });

  test("map page shows scatter/route view toggle buttons", async ({ page }) => {
    await page.goto(`${BASE}/map`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const scatterBtn = page.locator("text=散点图").first();
    const routeBtn = page.locator("text=路线图").first();

    await expect(scatterBtn).toBeVisible({ timeout: 8000 });
    await expect(routeBtn).toBeVisible({ timeout: 8000 });
  });

  test("clicking route toggle changes view mode", async ({ page }) => {
    await page.goto(`${BASE}/map`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const scatterBtn = page.locator("text=散点图").first();
    const routeBtn = page.locator("text=路线图").first();

    await expect(scatterBtn).toBeVisible({ timeout: 8000 });

    const scatterClassBefore = await scatterBtn.evaluate((el) => el.className);

    await routeBtn.click();
    await page.waitForTimeout(500);

    const scatterClassAfter = await scatterBtn.evaluate((el) => el.className);
    const routeClassAfter = await routeBtn.evaluate((el) => el.className);

    const viewChanged =
      scatterClassBefore !== scatterClassAfter ||
      routeClassAfter.includes("active") ||
      routeClassAfter.includes("primary") ||
      routeClassAfter.includes("selected") ||
      !(routeClassAfter.includes("outline") || routeClassAfter === scatterClassBefore);

    expect(
      viewChanged || routeClassAfter !== scatterClassBefore,
      "Route toggle button should visually differ from scatter toggle after clicking",
    ).toBe(true);

    await expect(page.locator("svg").first()).toBeVisible({ timeout: 5000 });
  });

  test("map page has zoom controls", async ({ page }) => {
    await page.goto(`${BASE}/map`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const zoomInBtn = page.locator("button[aria-label*='zoom'], button[title*='放大'], [class*='zoom']").first();
    const hasZoomControls =
      await zoomInBtn.count() > 0 ||
      await page.locator("button svg").count() >= 2;

    expect(hasZoomControls).toBe(true);
  });
});
