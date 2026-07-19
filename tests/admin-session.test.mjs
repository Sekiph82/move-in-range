import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("apps/admin/app/page.tsx", "utf8");
const loginPage = readFileSync("apps/admin/app/login/page.tsx", "utf8");
const session = readFileSync("apps/admin/app/session.ts", "utf8");
const loginRoute = readFileSync("apps/admin/app/api/admin-session/login/route.ts", "utf8");
const logoutRoute = readFileSync("apps/admin/app/api/admin-session/logout/route.ts", "utf8");
const refreshRoute = readFileSync("apps/admin/app/api/admin-session/refresh/route.ts", "utf8");
const simulateRoute = readFileSync("apps/admin/app/api/admin-session/simulate/route.ts", "utf8");
const cookieHelpers = readFileSync("apps/admin/app/api/admin-session/cookies.ts", "utf8");

test("admin app uses visible login and does not auto-login with embedded credentials", () => {
  assert.match(loginPage, /name="email"/);
  assert.match(loginPage, /name="password"/);
  assert.doesNotMatch(page, /LOCAL_ADMIN_PASSWORD|MoveInRangeAdminLocal|adminToken\(/);
  assert.doesNotMatch(loginPage, /MoveInRangeAdminLocal/);
});

test("admin protected dashboard redirects without session and has role-aware navigation", () => {
  assert.match(session, /redirect\("\/login/);
  assert.match(session, /roleNavigation/);
  assert.match(session, /clinical_reviewer: \["Dashboard", "Policies", "Simulator"\]/);
  assert.match(session, /support: \["Dashboard", "Users", "Privacy Jobs", "Notifications", "Audit"\]/);
  assert.match(session, /System: "\/system"/);
  assert.match(session, /"Privacy Jobs": "\/privacy-jobs"/);
  assert.match(page, /redirect\("\/dashboard"\)/);
});

test("admin session cookies are http-only for credentials and csrf-protected for state changes", () => {
  assert.match(loginRoute, /admin\/auth\/login/);
  assert.match(refreshRoute, /auth\/refresh/);
  assert.match(logoutRoute, /csrf_failed/);
  assert.match(simulateRoute, /x-csrf-token/);
  assert.match(cookieHelpers, /httpOnly: true/);
  assert.match(cookieHelpers, /sameSite: "lax"/);
  assert.match(cookieHelpers, /secure: secureCookie\(\)/);
  assert.match(cookieHelpers, /name !== csrfCookie/);
});
