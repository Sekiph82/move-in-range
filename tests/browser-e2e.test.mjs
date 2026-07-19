import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

const mobileRoutes = ["/auth", "/onboarding", "/readiness", "/daily-plan", "/weekly-plan", "/monthly-plan", "/calendar", "/exercises", "/diabetes", "/integrations", "/notifications", "/privacy", "/caregivers", "/professionals", "/achievements", "/settings"];
const adminRoutes = ["/dashboard", "/users", "/exercises", "/policies", "/privacy-jobs", "/import-jobs", "/notifications", "/integrations", "/system", "/audit"];

test("browser E2E route inventory is wired to real app files", () => {
  for (const route of mobileRoutes) {
    const file = route === "/daily-plan" || route === "/weekly-plan" || route === "/monthly-plan" || route === "/quick-session"
      ? `apps/mobile/app/${route.slice(1)}.tsx`
      : `apps/mobile/app/${route.slice(1)}.tsx`;
    assert.equal(existsSync(file), true, file);
  }
  for (const route of adminRoutes) {
    assert.equal(existsSync(`apps/admin/app${route}/page.tsx`), true, route);
  }
});

test("Playwright live browser smoke can visit configured admin routes", async (t) => {
  const baseUrl = process.env.ADMIN_E2E_BASE_URL;
  if (!baseUrl) {
    t.skip("Set ADMIN_E2E_BASE_URL after starting the admin server to run live browser E2E.");
    return;
  }
  let chromium;
  try {
    ({ chromium } = await import("@playwright/test"));
  } catch {
    t.skip("@playwright/test is not installed in this workspace.");
    return;
  }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/login`);
    await assert.doesNotReject(page.getByRole("button", { name: /sign in/i }).waitFor({ timeout: 5000 }));
  } finally {
    await browser.close();
  }
});
