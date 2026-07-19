import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";

const mobileRoutes = ["/auth/index", "/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password", "/auth/reset-password-success", "/auth/session-expired", "/onboarding", "/readiness", "/daily-plan", "/weekly-plan", "/monthly-plan", "/calendar", "/exercises", "/diabetes", "/integrations", "/notifications", "/privacy", "/caregivers", "/professionals", "/achievements", "/settings"];
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
    async function loginAs(loginEmail, loginPassword) {
      await page.goto(`${baseUrl}/login`);
      await page.getByLabel("Email").fill(loginEmail);
      await page.getByLabel("Password").fill(loginPassword);
      await page.getByRole("button", { name: /sign in/i }).click({ noWaitAfter: true });
      await page.waitForTimeout(1000);
    }
    async function logoutByCsrf() {
      const csrf = (await page.context().cookies()).find((cookie) => cookie.name === "mir_admin_csrf")?.value;
      const response = await page.request.post(`${baseUrl}/api/admin-session/logout`, { form: { csrf }, maxRedirects: 0 });
      assert.equal(response.status(), 303);
    }
    async function postAdminMutation(form) {
      const csrf = (await page.context().cookies()).find((cookie) => cookie.name === "mir_admin_csrf")?.value;
      return page.request.post(`${baseUrl}/api/admin-session/mutate`, { form: { csrf, ...form }, maxRedirects: 0 });
    }
    await page.goto(`${baseUrl}/dashboard`);
    await assert.doesNotReject(page.getByRole("heading", { name: /moveinrange admin/i }).waitFor({ timeout: 5000 }));

    const invalid = await page.request.post(`${baseUrl}/api/admin-session/login`, {
      form: { email, password: "incorrect-password" },
      maxRedirects: 0
    });
    assert.equal(invalid.status(), 303);
    assert.match(invalid.headers().location ?? "", /\/login\?error=(invalid_credentials|rate_limited|api_unavailable)/);

    await loginAs(email, password);
    await page.goto(`${baseUrl}/dashboard`);
    await assert.doesNotReject(page.getByRole("heading", { name: /dashboard/i }).waitFor({ timeout: 8000 }));
    await page.getByRole("button", { name: /prepare disposable test records/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));
    await page.screenshot({ path: "test-results/acceptance/admin-dashboard.png", fullPage: true });

    for (const route of ["/users", "/exercises", "/policies", "/privacy-jobs"]) {
      await page.goto(`${baseUrl}${route}`);
      await assert.doesNotReject(page.locator("main").waitFor({ timeout: 8000 }));
    }
    await page.goto(`${baseUrl}/users`);
    await page.screenshot({ path: "test-results/acceptance/admin-user-table.png", fullPage: true });
    await page.getByLabel("Email search").fill("closed-beta-e2e@example.test");
    await page.getByRole("button", { name: /^search$/i }).click();
    await page.getByRole("link", { name: /\/users\/usr_closed_beta_e2e/i }).click();
    await page.getByLabel("Disable reason").fill("closed beta E2E disable");
    await page.getByRole("button", { name: /^disable user$/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));
    await assert.doesNotReject(page.getByText(/Deleted/i).waitFor({ timeout: 8000 }));
    await page.getByLabel("Enable reason").fill("closed beta E2E enable");
    await page.getByRole("button", { name: /^enable user$/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));
    await page.locator('select[name="role"]').selectOption("analyst");
    await page.getByLabel("Role update reason").fill("closed beta E2E role update");
    await page.getByRole("button", { name: /update user role/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));

    await page.goto(`${baseUrl}/exercises`);
    await page.screenshot({ path: "test-results/acceptance/admin-exercises.png", fullPage: true });
    await page.goto(`${baseUrl}/exercises/exercise-closed-beta-admin-e2e`);
    const turkishTitle = `Kapali beta ${Date.now()}`;
    await page.getByLabel("Turkish title").fill(turkishTitle);
    await page.getByLabel("Turkish instruction steps").fill("Nefes al\nKontrollu hareket et");
    await page.getByLabel("Form cues").fill("Dik dur");
    await page.getByLabel("Common mistakes").fill("Acele etme");
    await page.getByLabel("Breathing cues").fill("Nefes ver");
    await page.getByRole("button", { name: /save translation/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));
    await page.getByLabel("Category").fill("mobility");
    await page.getByLabel("Equipment").fill("chair");
    await page.getByLabel("Position").fill("seated");
    await page.getByLabel("Difficulty").fill("easy");
    await page.getByRole("button", { name: /save metadata/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));
    await page.getByLabel("Safety tags").fill("closed_beta_reviewed");
    await page.getByLabel("Restricted regions").fill("knee");
    await page.getByLabel("Contraindication categories").fill("acute_pain");
    await page.getByRole("button", { name: /save safety review/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));
    assert.equal(await page.getByLabel("Turkish title").inputValue(), turkishTitle);
    await page.getByLabel("Substitution exercise id").first().fill("exercise-closed-beta-admin-substitution");
    await page.getByRole("button", { name: /add substitution/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));
    await page.getByRole("button", { name: /^publish$/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));
    await page.getByRole("button", { name: /^unpublish$/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));
    await logoutByCsrf();
    await loginAs("closed-beta-content@example.test", "MoveInRangeAdmin1");
    await page.goto(`${baseUrl}/exercises/exercise-closed-beta-admin-e2e`);
    await assert.doesNotReject(page.getByLabel("Turkish title").waitFor({ timeout: 8000 }));
    await assert.rejects(page.getByLabel("Safety tags").waitFor({ timeout: 1000 }));
    await page.getByLabel("Turkish title").fill(`Editor ${turkishTitle}`);
    await page.getByLabel("Turkish instruction steps").fill("Editor adim");
    await page.getByRole("button", { name: /save translation/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));
    const contentSafetyDenied = await postAdminMutation({ operation: "exercise_safety_update", exercise_id: "exercise-closed-beta-admin-e2e", safety_tags: "forged", review_reason: "forged" });
    assert.equal(contentSafetyDenied.status(), 303);
    assert.match(contentSafetyDenied.headers().location ?? "", /\/forbidden\?error=insufficient_role/);
    await logoutByCsrf();
    await loginAs("closed-beta-exercise@example.test", "MoveInRangeAdmin1");
    await page.goto(`${baseUrl}/exercises/exercise-closed-beta-admin-e2e`);
    await assert.doesNotReject(page.getByLabel("Safety tags").waitFor({ timeout: 8000 }));
    await assert.rejects(page.getByLabel("Turkish title").waitFor({ timeout: 1000 }));
    await page.getByLabel("Safety tags").fill("closed_beta_reviewed");
    await page.getByRole("button", { name: /save safety review/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));
    const reviewerTranslationDenied = await postAdminMutation({ operation: "exercise_translation_update", exercise_id: "exercise-closed-beta-admin-e2e", locale: "tr", title: "forged", instruction_steps: "forged", change_reason: "forged" });
    assert.equal(reviewerTranslationDenied.status(), 303);
    assert.match(reviewerTranslationDenied.headers().location ?? "", /\/forbidden\?error=insufficient_role/);
    await logoutByCsrf();
    await loginAs(email, password);

    const policyVersion = `closed-beta-${Date.now()}`;
    await page.goto(`${baseUrl}/policies`);
    await page.getByLabel("Version").fill(policyVersion);
    await page.getByRole("button", { name: /create draft/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));
    await page.getByRole("link", { name: new RegExp(`/policies/${policyVersion}`) }).click();
    await page.getByLabel("Draft change reason").fill("closed beta policy edit");
    await page.getByRole("button", { name: /save policy edit/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));
    await page.getByRole("button", { name: /^submit$/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));
    await logoutByCsrf();
    await loginAs("closed-beta-clinical@example.test", "MoveInRangeAdmin1");
    await page.goto(`${baseUrl}/policies/${policyVersion}`);
    await page.getByRole("button", { name: /^approve$/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));
    await logoutByCsrf();
    await loginAs(email, password);
    await page.goto(`${baseUrl}/policies/${policyVersion}`);
    await page.getByRole("button", { name: /^publish$/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));
    await page.getByRole("button", { name: /^rollback$/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));

    await page.goto(`${baseUrl}/privacy-jobs`);
    await page.getByRole("button", { name: /process export/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));
    await page.goto(`${baseUrl}/notifications`);
    await page.getByRole("button", { name: /retry notification/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));
    await page.goto(`${baseUrl}/integrations`);
    await page.getByRole("button", { name: /disable connection/i }).click();
    await assert.doesNotReject(page.getByText(/saved/i).waitFor({ timeout: 8000 }));

    await page.goto(`${baseUrl}/policies/draft-2026-07-18/simulate`);
    await page.screenshot({ path: "test-results/acceptance/admin-policy-simulator.png", fullPage: true });
    await page.goto(`${baseUrl}/audit`);
    await assert.doesNotReject(page.getByText(/admin\\.user|admin.user|admin.exercise|admin.policy|admin.privacy|admin.notification|admin.integration/i).first().waitFor({ timeout: 8000 }));

    const csrfResponse = await page.request.post(`${baseUrl}/api/admin-session/logout`, { form: { csrf: "wrong" } });
    assert.equal(csrfResponse.status(), 403);

    await logoutByCsrf();
    await page.goto(`${baseUrl}/dashboard`);
    await assert.doesNotReject(page.getByRole("heading", { name: /moveinrange admin/i }).waitFor({ timeout: 8000 }));
  } finally {
    await browser.close();
  }
});
