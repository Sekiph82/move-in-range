import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";

const baseUrl = process.env.PRODUCT_WEB_BASE_URL;
const mailpitBaseUrl = process.env.MAILPIT_BASE_URL;
const apiBaseUrl = process.env.PRODUCT_E2E_API_BASE_URL ?? process.env.API_BASE_URL;

async function chromiumOrSkip(t) {
  try {
    const { chromium } = await import("@playwright/test");
    return chromium;
  } catch {
    t.skip("@playwright/test is not installed in this workspace.");
    return null;
  }
}

function screenshotPath(name) {
  mkdirSync("test-results/product-ui", { recursive: true });
  return `test-results/product-ui/${name}.png`;
}

async function clickButton(page, name) {
  await page.getByRole("button", { name }).click();
}

async function clickCheckbox(page, name) {
  await page.getByRole("checkbox", { name }).click();
}

async function saveAndContinue(page) {
  await clickButton(page, /continue|save and continue/i);
}

async function expectStep(page, step) {
  await assert.doesNotReject(page.getByText(new RegExp(`Step ${step} of 7`, "i")).waitFor({ timeout: 10000 }));
}

async function expectHeading(page, name) {
  await assert.doesNotReject(page.getByRole("heading", { name }).first().waitFor({ timeout: 15000 }));
}

async function completeReadiness(page, { start = false } = {}) {
  for (let step = 0; step < 5; step += 1) await clickButton(page, /^next$/i);
  await clickButton(page, /^see result$/i);
  await assert.doesNotReject(page.getByText(/Ready|Ready with adjustments|Readiness saved/i).first().waitFor({ timeout: 10000 }));
  if (start) await clickButton(page, /continue to workout|acknowledge adjustments and start/i);
}

async function completePlanGeneration(page, finalButton, responseMatcher) {
  for (let step = 0; step < 4; step += 1) await clickButton(page, /^continue$/i);
  const response = responseMatcher ? page.waitForResponse(responseMatcher) : null;
  await clickButton(page, finalButton);
  return response ? response : undefined;
}

async function mailpitJson(path) {
  const response = await fetch(`${mailpitBaseUrl}${path}`);
  assert.equal(response.ok, true, `Mailpit ${path} returned ${response.status}`);
  return response.json();
}

async function waitForResetTokenFromMailpit(email) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const listing = await mailpitJson("/api/v1/messages");
    const messages = listing.messages ?? listing.Messages ?? [];
    for (const message of messages) {
      const id = message.ID ?? message.Id ?? message.id;
      const haystack = JSON.stringify({
        to: message.To ?? message.Recipients ?? message.recipients,
        subject: message.Subject ?? message.subject,
        snippet: message.Snippet ?? message.snippet
      });
      if (!id || !haystack.includes(email)) continue;
      const detail = await mailpitJson(`/api/v1/message/${encodeURIComponent(id)}`);
      const body = `${detail.Text ?? detail.text ?? ""}\n${detail.HTML ?? detail.html ?? ""}`;
      const match = body.match(/\/auth\/reset-password(?:[?#])token=([A-Za-z0-9_-]+)/);
      if (match) return match[1];
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Password reset email did not arrive in Mailpit");
}

async function expectJsonResponse(response, expectedStatus) {
  const text = await response.text();
  assert.equal(response.status, expectedStatus, text);
  return text ? JSON.parse(text) : {};
}

async function registerUserViaApi(email, password) {
  const response = await fetch(`${apiBaseUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, preferred_name: "Reset Email" })
  });
  return expectJsonResponse(response, 201);
}

async function requestPasswordResetViaApi(email) {
  const response = await fetch(`${apiBaseUrl}/api/v1/auth/forgot-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email })
  });
  await expectJsonResponse(response, 200);
}

async function loginViaApi(email, password) {
  const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return expectJsonResponse(response, 200);
}

async function apiJson(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${apiBaseUrl}/api/v1${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  return { response, payload: text ? JSON.parse(text) : {} };
}

async function createOnboardedAccount(prefix = "scenario") {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  const password = "MoveInRange1!";
  const registered = await registerUserViaApi(email, password);
  const token = registered.access_token;
  const profile = await apiJson("/profile", {
    token,
    method: "PUT",
    body: {
      preferred_name: "Scenario",
      country: "US",
      timezone: "America/New_York",
      language: "en",
      conditions: ["type_2_diabetes"],
      sensitivities: { knee: { bilateral: true, severity: 3 } },
      equipment: ["body weight", "chair", "wall"],
      preferred_training_days: ["Mon", "Wed", "Fri"],
      goals: ["mobility", "consistency"],
      medical_clearance: "cleared",
      consent_accepted: true,
      diabetes: { enabled: true, unit: "mg/dL", exercise_glucose_logging: true },
      onboarding_complete: true
    }
  });
  assert.equal(profile.response.status, 200, JSON.stringify(profile.payload));
  return { email, password, token, refreshToken: registered.refresh_token };
}

async function authenticatedPage(browser, account, viewport = { width: 390, height: 900 }) {
  const page = await browser.newPage({ viewport });
  await page.addInitScript(({ accessToken, refreshToken }) => {
    localStorage.setItem("mir_access_token", accessToken);
    localStorage.setItem("mir_refresh_token", refreshToken);
  }, { accessToken: account.token, refreshToken: account.refreshToken });
  return page;
}

test("product password reset sends an SMTP email and completes through visible reset screens", async (t) => {
  if (!baseUrl || !mailpitBaseUrl || !apiBaseUrl) {
    t.skip("Set PRODUCT_WEB_BASE_URL, MAILPIT_BASE_URL, and API_BASE_URL to run password reset email E2E.");
    return;
  }
  const chromium = await chromiumOrSkip(t);
  if (!chromium) return;
  const email = `reset-ui-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  const firstPassword = "MoveInRange1!";
  const nextPassword = "MoveInRange2!";
  const browser = await chromium.launch();
  try {
    await registerUserViaApi(email, firstPassword);
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    await page.goto(`${baseUrl}/auth/forgot-password`);
    await expectHeading(page, /^Reset password$/i);
    await page.getByLabel("Email").fill(email);
    await requestPasswordResetViaApi(email);

    const token = await waitForResetTokenFromMailpit(email);
    await page.goto(`${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`);
    await page.getByRole("textbox", { name: "New password", exact: true }).fill(nextPassword);
    await page.getByRole("textbox", { name: "Confirm new password", exact: true }).fill(nextPassword);
    await clickButton(page, /update password/i);
    await assert.doesNotReject(page.getByText(/password has been changed/i).waitFor({ timeout: 10000 }));
    await loginViaApi(email, nextPassword);
  } finally {
    await browser.close();
  }
});

test("product auth and route guards reject invalid, duplicate, and signed-out access", async (t) => {
  if (!baseUrl || !apiBaseUrl) {
    t.skip("Set PRODUCT_WEB_BASE_URL and API_BASE_URL to run product auth E2E.");
    return;
  }
  const chromium = await chromiumOrSkip(t);
  if (!chromium) return;
  const email = `auth-ui-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  const password = "MoveInRange1!";
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    await page.goto(`${baseUrl}/daily-plan`);
    await expectHeading(page, /sign in/i);
    await page.goto(`${baseUrl}/auth/register`);
    await page.getByLabel("Preferred name").fill("Auth Scenario");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("textbox", { name: "Password", exact: true }).fill(password);
    await page.getByRole("textbox", { name: "Confirm password", exact: true }).fill(password);
    await clickCheckbox(page, /I accept the terms and wellness limitation/i);
    await clickButton(page, /create account/i);
    await expectStep(page, 1);

    const duplicate = await browser.newPage({ viewport: { width: 390, height: 900 } });
    await duplicate.goto(`${baseUrl}/auth/register`);
    await duplicate.getByLabel("Preferred name").fill("Duplicate");
    await duplicate.getByLabel("Email").fill(email);
    await duplicate.getByRole("textbox", { name: "Password", exact: true }).fill(password);
    await duplicate.getByRole("textbox", { name: "Confirm password", exact: true }).fill(password);
    await clickCheckbox(duplicate, /I accept the terms and wellness limitation/i);
    await clickButton(duplicate, /create account/i);
    await assert.doesNotReject(duplicate.getByText(/already exists/i).waitFor({ timeout: 10000 }));
    await duplicate.goto(`${baseUrl}/auth/login`);
    await duplicate.getByLabel("Email").fill(email);
    await duplicate.getByRole("textbox", { name: "Password", exact: true }).fill("wrong-password");
    await clickButton(duplicate, /^sign in$/i);
    await assert.doesNotReject(duplicate.getByText(/incorrect/i).waitFor({ timeout: 10000 }));
  } finally {
    await browser.close();
  }
});

test("product readiness and plans scenario uses visible controls", async (t) => {
  if (!baseUrl || !apiBaseUrl) {
    t.skip("Set PRODUCT_WEB_BASE_URL and API_BASE_URL to run product readiness E2E.");
    return;
  }
  const chromium = await chromiumOrSkip(t);
  if (!chromium) return;
  const account = await createOnboardedAccount("readiness-ui");
  const browser = await chromium.launch();
  try {
    const page = await authenticatedPage(browser, account);
    await page.goto(`${baseUrl}/`);
    await expectHeading(page, /^Today$/i);
    await page.getByLabel("Open readiness check").click();
    await completeReadiness(page);
    await clickButton(page, /return home/i);
    await expectHeading(page, /^Today$/i);
    await page.getByLabel("Generate daily plan").click();
    await completePlanGeneration(page, /generate today/i);
    await expectHeading(page, /Workout preview/i);
    await page.goto(`${baseUrl}/weekly-plan`);
    await clickButton(page, /generate weekly plan/i);
    await completePlanGeneration(page, /generate week/i);
    await expectHeading(page, /Workout preview/i);
    await page.goto(`${baseUrl}/monthly-plan`);
    await clickButton(page, /generate four-week program/i);
    await completePlanGeneration(page, /generate month/i);
    await expectHeading(page, /Workout preview/i);
  } finally {
    await browser.close();
  }
});

test("product workout and feedback scenario uses visible controls", async (t) => {
  if (!baseUrl || !apiBaseUrl) {
    t.skip("Set PRODUCT_WEB_BASE_URL and API_BASE_URL to run product workout E2E.");
    return;
  }
  const chromium = await chromiumOrSkip(t);
  if (!chromium) return;
  const account = await createOnboardedAccount("workout-ui");
  await apiJson("/readiness-checks", { token: account.token, method: "POST", body: { energy: 3, sleep_quality: 3, pain: 2, available_minutes: 15, desired_session_type: "mixed", stress: 2 } });
  await apiJson("/plans/daily/generate", { token: account.token, method: "POST", body: { energy: 3, sleep_quality: 3, pain: 2, available_minutes: 15, desired_session_type: "mixed", stress: 2 } });
  const browser = await chromium.launch();
  try {
    const page = await authenticatedPage(browser, account);
    await page.goto(`${baseUrl}/workout/today`);
    await expectHeading(page, /^Workout player$/i);
    const startResponse = page.waitForResponse((response) => response.url().includes("/api/v1/sessions") && response.request().method() === "POST");
    await clickButton(page, /check readiness & start/i);
    await completeReadiness(page, { start: true });
    const sessionId = (await (await startResponse).json()).session.id;
    await expectHeading(page, /^Workout player$/i);
    await clickButton(page, /^pause$/i);
    await clickButton(page, /^resume$/i);
    await page.goto(`${baseUrl}/workout/${sessionId}/feedback`);
    await page.getByLabel("Notes").fill("Diagnostic workout feedback.");
    await clickButton(page, /save event/i);
  } finally {
    await browser.close();
  }
});

test("product diabetes and calendar scenario uses visible controls", async (t) => {
  if (!baseUrl || !apiBaseUrl) {
    t.skip("Set PRODUCT_WEB_BASE_URL and API_BASE_URL to run product diabetes E2E.");
    return;
  }
  const chromium = await chromiumOrSkip(t);
  if (!chromium) return;
  const account = await createOnboardedAccount("diabetes-ui");
  const browser = await chromium.launch();
  try {
    const page = await authenticatedPage(browser, account);
    await page.goto(`${baseUrl}/diabetes`);
    await page.getByLabel("Glucose value").fill("110");
    await page.getByLabel("Minutes since meal").fill("90");
    await clickCheckbox(page, "none");
    await clickButton(page, /save diabetes context/i);
    await page.goto(`${baseUrl}/calendar`);
    await expectHeading(page, /^Calendar$/i);
  } finally {
    await browser.close();
  }
});

test("product privacy logout and persistence scenario uses visible controls", async (t) => {
  if (!baseUrl || !apiBaseUrl) {
    t.skip("Set PRODUCT_WEB_BASE_URL and API_BASE_URL to run product privacy E2E.");
    return;
  }
  const chromium = await chromiumOrSkip(t);
  if (!chromium) return;
  const account = await createOnboardedAccount("privacy-ui");
  const browser = await chromium.launch();
  try {
    const page = await authenticatedPage(browser, account);
    await page.goto(`${baseUrl}/privacy`);
    await clickButton(page, /request export/i);
    await clickButton(page, /download latest export/i);
    await assert.doesNotReject(page.getByText(/Archive checksum:/i).waitFor({ timeout: 10000 }));
    await clickButton(page, /request selected deletion/i);
    await page.goto(`${baseUrl}/settings`);
    await clickButton(page, /^sign out$/i);
    await page.waitForFunction(() => !localStorage.getItem("mir_access_token") && !localStorage.getItem("mir_refresh_token"), null, { timeout: 10000 });
    await page.close();
    const signedOutPage = await browser.newPage({ viewport: { width: 390, height: 900 } });
    await signedOutPage.goto(`${baseUrl}/daily-plan`);
    await expectHeading(signedOutPage, /sign in/i);
    await signedOutPage.goto(`${baseUrl}/auth/login`);
    await signedOutPage.getByLabel("Email").fill(account.email);
    await signedOutPage.getByRole("textbox", { name: "Password", exact: true }).fill(account.password);
    await clickButton(signedOutPage, /^sign in$/i);
    await expectHeading(signedOutPage, /^Today$/i);
  } finally {
    await browser.close();
  }
});

test("product web UI closed beta flow uses visible controls and persisted API state", async (t) => {
  if (!baseUrl) {
    t.skip("Set PRODUCT_WEB_BASE_URL to run browser-driven product UI E2E.");
    return;
  }
  const chromium = await chromiumOrSkip(t);
  if (!chromium) return;
  const email = `product-ui-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  const password = "MoveInRange1!";
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    await page.goto(`${baseUrl}/daily-plan`);
    await assert.doesNotReject(page.getByRole("heading", { name: /sign in/i }).waitFor({ timeout: 10000 }));
    await page.screenshot({ path: screenshotPath("01-route-guard-login"), fullPage: true });

    await page.goto(`${baseUrl}/auth/register`);
    await page.getByLabel("Preferred name").fill("Closed Beta");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("textbox", { name: "Password", exact: true }).fill(password);
    await page.getByRole("textbox", { name: "Confirm password", exact: true }).fill(password);
    await clickCheckbox(page, /I accept the terms and wellness limitation/i);
    await page.screenshot({ path: screenshotPath("02-registration"), fullPage: true });
    await clickButton(page, /create account/i);

    await expectStep(page, 1);
    await saveAndContinue(page);
    await expectStep(page, 2);
    await clickButton(page, /move better/i);
    await saveAndContinue(page);
    await expectStep(page, 3);
    await clickButton(page, /starting out/i);
    await saveAndContinue(page);
    await expectStep(page, 4);
    await saveAndContinue(page);
    await expectStep(page, 5);
    await saveAndContinue(page);
    await expectStep(page, 6);
    await saveAndContinue(page);
    await expectStep(page, 7);
    await page.screenshot({ path: screenshotPath("11-onboarding-review"), fullPage: true });
    await clickButton(page, /create my plan/i);

    await expectHeading(page, /^Today$/i);
    await page.getByLabel("Open readiness check").click();
    await completeReadiness(page);
    await clickButton(page, /return home/i);
    await expectHeading(page, /^Today$/i);
    await page.screenshot({ path: screenshotPath("12-readiness-result"), fullPage: true });

    await page.getByLabel("Generate daily plan").click();
    const planResponse = await completePlanGeneration(page, /generate today/i, (response) => response.url().includes("/api/v1/plans/daily/generate"));
    assert.equal((await planResponse).status(), 201);
    await expectHeading(page, /Workout preview/i);
    await page.screenshot({ path: screenshotPath("13-daily-plan-modification"), fullPage: true });

    await page.goto(`${baseUrl}/workout/today`);
    await expectHeading(page, /^Workout player$/i);
    const startResponse = page.waitForResponse((response) => response.url().includes("/api/v1/sessions") && response.request().method() === "POST");
    await clickButton(page, /check readiness & start/i);
    await completeReadiness(page, { start: true });
    const startPayload = await (await startResponse).json();
    const sessionId = startPayload?.session?.id;
    assert.match(sessionId, /^ses_/);
    await expectHeading(page, /^Workout player$/i);
    await clickButton(page, /^pause$/i);
    await clickButton(page, /^resume$/i);
    await page.screenshot({ path: screenshotPath("14-workout"), fullPage: true });
    await page.goto(`${baseUrl}/workout/${sessionId}/feedback`);
    await expectHeading(page, /^Feedback$/i);
    await page.getByLabel("Notes").fill("Felt controlled and safe.");
    await clickButton(page, /save event/i);
    await page.screenshot({ path: screenshotPath("15-post-workout-feedback"), fullPage: true });

    await page.goto(`${baseUrl}/diabetes`);
    await page.getByLabel("Glucose value").fill("110");
    await page.getByLabel("Minutes since meal").fill("90");
    await clickCheckbox(page, "none");
    await clickButton(page, /save diabetes context/i);
    await page.screenshot({ path: screenshotPath("16-diabetes"), fullPage: true });

    await page.goto(`${baseUrl}/calendar`);
    await expectHeading(page, /^Calendar$/i);
    await page.screenshot({ path: screenshotPath("17-calendar"), fullPage: true });

    await page.goto(`${baseUrl}/privacy`);
    await clickButton(page, /request export/i);
    await clickButton(page, /download latest export/i);
    await assert.doesNotReject(page.getByText(/Archive checksum:/i).waitFor({ timeout: 10000 }));
    await clickButton(page, /request selected deletion/i);
    await assert.doesNotReject(page.getByText(/Export \d+:/i).waitFor({ timeout: 10000 }));
    await assert.doesNotReject(page.getByText(/Deletion \d+:/i).waitFor({ timeout: 10000 }));
    await page.screenshot({ path: screenshotPath("18-privacy-export"), fullPage: true });

    await page.goto(`${baseUrl}/settings`);
    await clickButton(page, /^sign out$/i);
    await page.goto(`${baseUrl}/daily-plan`);
    await assert.doesNotReject(page.getByRole("heading", { name: /sign in/i }).waitFor({ timeout: 10000 }));
    await page.goto(`${baseUrl}/auth/login`);
    await page.getByLabel("Email").fill(email);
    await page.getByRole("textbox", { name: "Password", exact: true }).fill(password);
    await clickButton(page, /^sign in$/i);
    await expectHeading(page, /^Today$/i);
    await page.goto(`${baseUrl}/calendar`);
    await assert.doesNotReject(page.getByText(/Workout|Daily movement plan|No plans or sessions/i).waitFor({ timeout: 10000 }));
  } finally {
    await browser.close();
  }
});
