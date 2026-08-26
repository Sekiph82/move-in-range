import { NextRequest, NextResponse } from "next/server";
import { apiBase } from "../../../session";
import { setSessionCookies } from "../cookies";
import { adminRedirect } from "../redirect";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password || password.length < 8) {
    return adminRedirect(request, "/login?error=invalid_credentials");
  }
  const response = await fetch(`${apiBase}/api/v1/admin/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  }).catch(() => null);
  if (!response) return adminRedirect(request, "/login?error=api_unavailable");
  if (response.status === 429) return adminRedirect(request, "/login?error=rate_limited");
  if (response.status === 401) return adminRedirect(request, "/login?error=invalid_credentials");
  if (response.status === 403) return adminRedirect(request, "/login?error=account_disabled");
  if (!response.ok) return adminRedirect(request, "/login?error=api_unavailable");
  const payload = await response.json();
  const redirect = adminRedirect(request, "/");
  setSessionCookies(redirect, payload);
  return redirect;
}
