import { NextRequest, NextResponse } from "next/server";
import { apiBase, csrfCookie, sessionCookie } from "../../../session";

export async function POST(request: NextRequest) {
  const submitted = request.headers.get("x-csrf-token") ?? "";
  const stored = request.cookies.get(csrfCookie)?.value ?? "";
  if (!stored || submitted !== stored) {
    return NextResponse.json({ code: "csrf_failed", message: "Session request rejected.", details: {} }, { status: 403 });
  }
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return NextResponse.json({ code: "missing_session", message: "Session is missing.", details: {} }, { status: 401 });
  const body = await request.json();
  const response = await fetch(`${apiBase}/api/v1/admin/policy-simulator`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  return NextResponse.json(await response.json(), { status: response.status });
}
