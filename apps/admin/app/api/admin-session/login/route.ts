import { NextRequest, NextResponse } from "next/server";
import { apiBase } from "../../../session";
import { setSessionCookies } from "../cookies";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password || password.length < 8) {
    return NextResponse.redirect(new URL("/login?error=invalid_credentials", request.url), 303);
  }
  const response = await fetch(`${apiBase}/api/v1/admin/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  }).catch(() => null);
  if (!response) return NextResponse.redirect(new URL("/login?error=api_unavailable", request.url), 303);
  if (response.status === 429) return NextResponse.redirect(new URL("/login?error=rate_limited", request.url), 303);
  if (response.status === 401) return NextResponse.redirect(new URL("/login?error=invalid_credentials", request.url), 303);
  if (response.status === 403) return NextResponse.redirect(new URL("/login?error=account_disabled", request.url), 303);
  if (!response.ok) return NextResponse.redirect(new URL("/login?error=api_unavailable", request.url), 303);
  const payload = await response.json();
  const redirect = NextResponse.redirect(new URL("/", request.url), 303);
  setSessionCookies(redirect, payload);
  return redirect;
}
