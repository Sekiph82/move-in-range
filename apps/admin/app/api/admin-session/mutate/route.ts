import { NextRequest, NextResponse } from "next/server";
import { apiBase, csrfCookie, sessionCookie } from "../../../session";
import { adminRedirect } from "../redirect";

const reserved = new Set(["csrf", "method", "path", "redirectTo", "payload_json"]);

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const submitted = String(form.get("csrf") ?? request.headers.get("x-csrf-token") ?? "");
  const stored = request.cookies.get(csrfCookie)?.value ?? "";
  if (!stored || submitted !== stored) {
    return NextResponse.json({ code: "csrf_failed", message: "Mutation rejected.", details: {} }, { status: 403 });
  }
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return adminRedirect(request, "/login?error=session_expired");
  const path = String(form.get("path") ?? "");
  const method = String(form.get("method") ?? "POST").toUpperCase();
  const redirectTo = String(form.get("redirectTo") ?? "/dashboard");
  if (!path.startsWith("/admin/") || !["POST", "PATCH"].includes(method)) {
    return adminRedirect(request, `${redirectTo}?error=invalid_mutation`);
  }
  let payload: Record<string, unknown> = {};
  const payloadJson = String(form.get("payload_json") ?? "");
  if (payloadJson) {
    try {
      payload = JSON.parse(payloadJson) as Record<string, unknown>;
    } catch {
      return adminRedirect(request, `${redirectTo}?error=invalid_payload`);
    }
  } else {
    for (const [key, value] of form.entries()) {
      if (!reserved.has(key)) payload[key] = String(value);
    }
  }
  const response = await fetch(`${apiBase}/api/v1${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(method === "PATCH" ? { payload } : payload)
  }).catch(() => null);
  if (!response) return adminRedirect(request, `${redirectTo}?error=api_unavailable`);
  if (!response.ok) return adminRedirect(request, `${redirectTo}?error=mutation_failed_${response.status}`);
  return adminRedirect(request, `${redirectTo}?success=mutation_saved`);
}
