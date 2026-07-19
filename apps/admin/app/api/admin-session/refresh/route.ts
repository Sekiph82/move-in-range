import { NextRequest, NextResponse } from "next/server";
import { apiBase, refreshCookie } from "../../../session";
import { clearSessionCookies, setSessionCookies } from "../cookies";

export async function POST(request: NextRequest) {
  const refresh = request.cookies.get(refreshCookie)?.value;
  if (!refresh) return NextResponse.json({ code: "missing_session", message: "Session is missing.", details: {} }, { status: 401 });
  const response = await fetch(`${apiBase}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh })
  }).catch(() => null);
  if (!response || !response.ok) {
    const failed = NextResponse.json({ code: "session_expired", message: "Session expired.", details: {} }, { status: 401 });
    clearSessionCookies(failed);
    return failed;
  }
  const payload = await response.json();
  const ok = NextResponse.json({ refreshed: true });
  setSessionCookies(ok, payload);
  return ok;
}
