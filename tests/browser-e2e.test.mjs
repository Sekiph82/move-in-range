import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";

const mobileRoutes = ["/auth/index", "/auth/login", "/auth/register", "/auth/forgot-password", "/auth/session-expired", "/onboarding", "/readiness", "/daily-plan", "/weekly-plan", "/monthly-plan", "/calendar", "/exercises", "/diabetes", "/integrations", "/notifications", "/privacy", "/caregivers", "/professionals", "/achievements", "/settings"];
const adminRoutes = ["/dashboard", "/users", "/exercises", "/policies", "/privacy-jobs", "/import-jobs", "/notifications", "/integrations", "/system", "/audit"];

test("browser E2E route inventory is wired to real app files", () => {
  for (const route of mobileRoutes) {
    const file = `apps/mobile/app/${route.slice(1)}.tsx`;
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

test("Playwright admin acceptance performs login, navigation, screenshots, logout, and CSRF rejection", async (t) => {
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
  mkdirSync("test-results/acceptance", { recursive: true });
  const email = process.env.LOCAL_ADMIN_EMAIL ?? "admin@moveinrange.local";
  const password = process.env.LOCAL_ADMIN_PASSWORD ?? "MoveInRangeAdminLocal!";
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.goto(`${baseUrl}/dashboard`);
    await assert.doesNotReject(page.getByRole("heading", { name: /moveinrange admin/i }).waitFor({ timeout: 5000 }));

    const invalid = await page.request.post(`${baseUrl}/api/admin-session/login`, {
      form: { email, password: "incorrect-password" },
      maxRedirects: 0
    });
    assert.equal(invalid.status(), 303);
    assert.match(invalid.headers().location ?? "", /\/login\?error=(invalid_credentials|rate_limited|api_unavailable)/);

    await page.goto(`${baseUrl}/login`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click({ noWaitAfter: true });
    await page.waitForTimeout(1000);
    await page.goto(`${baseUrl}/dashboard`);
    await assert.doesNotReject(page.getByRole("heading", { name: /dashboard/i }).waitFor({ timeout: 8000 }));
    await page.screenshot({ path: "test-results/acceptance/admin-dashboard.png", fullPage: true });

    for (const route of ["/users", "/exercises", "/policies", "/privacy-jobs"]) {
      await page.goto(`${baseUrl}${route}`);
      await assert.doesNotReject(page.locator("main").waitFor({ timeout: 8000 }));
    }
    await page.goto(`${baseUrl}/users`);
    await page.screenshot({ path: "test-results/acceptance/admin-user-table.png", fullPage: true });
    await page.goto(`${baseUrl}/exercises`);
    await page.screenshot({ path: "test-results/acceptance/admin-exercises.png", fullPage: true });
    await page.goto(`${baseUrl}/policies/draft-2026-07-18/simulate`);
    await page.screenshot({ path: "test-results/acceptance/admin-policy-simulator.png", fullPage: true });

    const csrfResponse = await page.request.post(`${baseUrl}/api/admin-session/logout`, { form: { csrf: "wrong" } });
    assert.equal(csrfResponse.status(), 403);

    const csrf = (await page.context().cookies()).find((cookie) => cookie.name === "mir_admin_csrf")?.value;
    const logout = await page.request.post(`${baseUrl}/api/admin-session/logout`, {
      form: { csrf },
      maxRedirects: 0
    });
    assert.equal(logout.status(), 303);
    await page.goto(`${baseUrl}/dashboard`);
    await assert.doesNotReject(page.getByRole("heading", { name: /moveinrange admin/i }).waitFor({ timeout: 8000 }));
  } finally {
    await browser.close();
  }
});
