import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8200").replace(/\/api\/v1\/?$/, "");
export const sessionCookie = "mir_admin_access";
export const refreshCookie = "mir_admin_refresh";
export const csrfCookie = "mir_admin_csrf";

export type AdminIdentity = {
  id: string;
  email: string;
  role: "super_admin" | "clinical_reviewer" | "exercise_reviewer" | "content_editor" | "support" | "analyst";
};

export const roleNavigation: Record<AdminIdentity["role"], string[]> = {
  super_admin: ["Users", "Policies", "Exercise Review", "Simulator", "Privacy Jobs", "System", "Audit Logs", "Import Jobs", "Feature Flags"],
  clinical_reviewer: ["Policies", "Simulator"],
  exercise_reviewer: ["Exercise Review"],
  content_editor: ["Import Jobs", "Feature Flags"],
  support: ["Users", "Privacy Jobs", "Audit Logs"],
  analyst: ["System", "Feature Flags"]
};

export async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  if (!token) redirect("/login");
  const response = await fetch(`${apiBase}/api/v1/admin/auth/me`, {
    cache: "no-store",
    headers: { authorization: `Bearer ${token}` }
  });
  if (response.status === 401) redirect("/login?error=session_expired");
  if (response.status === 403) redirect("/forbidden");
  if (!response.ok) redirect("/login?error=api_unavailable");
  const payload = await response.json();
  return { admin: payload.admin as AdminIdentity, token, csrf: cookieStore.get(csrfCookie)?.value ?? "" };
}

export async function readAdminApi(path: string, token: string) {
  try {
    const response = await fetch(`${apiBase}/api/v1${path}`, {
      cache: "no-store",
      headers: { authorization: `Bearer ${token}` }
    });
    if (response.status === 403) return { error: "Forbidden" };
    if (!response.ok) return { error: `API returned ${response.status}` };
    return response.json();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "API unavailable" };
  }
}
