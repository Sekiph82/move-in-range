import { NextRequest, NextResponse } from "next/server";
import { apiBase, csrfCookie, sessionCookie } from "../../../session";
import { clearSessionCookies } from "../cookies";
import { adminRedirect } from "../redirect";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const submitted = String(form.get("csrf") ?? request.headers.get("x-csrf-token") ?? "");
  const stored = request.cookies.get(csrfCookie)?.value ?? "";
  if (!stored || submitted !== stored) {
    return NextResponse.json({ code: "csrf_failed", message: "Session request rejected.", details: {} }, { status: 403 });
  }
  const token = request.cookies.get(sessionCookie)?.value;
  if (token) {
    await fetch(`${apiBase}/api/v1/admin/auth/logout`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` }
    }).catch(() => null);
  }
  const redirect = adminRedirect(request, "/login");
  clearSessionCookies(redirect);
  return redirect;
}
