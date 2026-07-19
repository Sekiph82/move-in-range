import { NextResponse } from "next/server";
import { csrfCookie, refreshCookie, sessionCookie } from "../../session";

export function secureCookie() {
  if (process.env.ADMIN_COOKIE_SECURE === "false") return false;
  if (process.env.ADMIN_COOKIE_SECURE === "true") return true;
  return process.env.NODE_ENV === "production";
}

export function setSessionCookies(response: NextResponse, payload: { access_token: string; refresh_token: string }) {
  const csrf = crypto.randomUUID();
  response.cookies.set(sessionCookie, payload.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(),
    path: "/",
    maxAge: 30 * 60
  });
  response.cookies.set(refreshCookie, payload.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(),
    path: "/",
    maxAge: 14 * 24 * 60 * 60
  });
  response.cookies.set(csrfCookie, csrf, {
    httpOnly: false,
    sameSite: "lax",
    secure: secureCookie(),
    path: "/",
    maxAge: 14 * 24 * 60 * 60
  });
}

export function clearSessionCookies(response: NextResponse) {
  for (const name of [sessionCookie, refreshCookie, csrfCookie]) {
    response.cookies.set(name, "", {
      httpOnly: name !== csrfCookie,
      sameSite: "lax",
      secure: secureCookie(),
      path: "/",
      maxAge: 0
    });
  }
}
