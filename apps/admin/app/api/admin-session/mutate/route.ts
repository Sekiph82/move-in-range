import { NextRequest, NextResponse } from "next/server";
import { apiBase, csrfCookie, sessionCookie, type AdminIdentity } from "../../../session";
import { adminRedirect } from "../redirect";

type Method = "POST" | "PATCH";
type RequiredRole = AdminIdentity["role"];

type Operation = {
  method: Method;
  allowedRoles: readonly RequiredRole[];
  fields: readonly string[];
  required?: readonly string[];
  enums?: Record<string, readonly string[]>;
  path: (fields: Record<string, string>) => string;
  redirectTo: (fields: Record<string, string>) => string;
  body: (fields: Record<string, string>) => unknown;
};

const adminRoles = ["super_admin", "clinical_reviewer", "exercise_reviewer", "content_editor", "support", "analyst"] as const;
const userAssignableRoles = ["user", ...adminRoles] as const;
const policyStatuses = ["draft", "submitted", "published", "rolled_back"] as const;
const clinicalReviewStates = ["draft", "submitted", "approved", "rejected"] as const;
const publishStates = ["published", "unpublished"] as const;
const privacyKinds = ["export", "deletion"] as const;
const privacyActions = ["process", "retry", "fail", "cancel", "approve"] as const;

const reserved = new Set(["csrf", "operation"]);

function segment(value: string, field: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("/") || trimmed.includes("\\") || /[\u0000-\u001f]/.test(trimmed)) {
    throw new Error(`invalid_${field}`);
  }
  return encodeURIComponent(trimmed);
}

function payload(fields: Record<string, string>, names: readonly string[]) {
  return Object.fromEntries(names.filter((name) => fields[name]?.trim()).map((name) => [name, fields[name].trim()]));
}

const operations = {
  e2e_seed: {
    method: "POST",
    allowedRoles: ["super_admin"],
    fields: [],
    path: () => "/admin/e2e-seed",
    redirectTo: () => "/dashboard",
    body: () => ({})
  },
  user_disable: {
    method: "PATCH",
    allowedRoles: ["support", "super_admin"],
    fields: ["user_id", "reason"],
    required: ["user_id", "reason"],
    path: (fields) => `/admin/users/${segment(fields.user_id, "user_id")}`,
    redirectTo: (fields) => `/users/${segment(fields.user_id, "user_id")}`,
    body: (fields) => ({ payload: { action: "disable", reason: fields.reason.trim() } })
  },
  user_enable: {
    method: "PATCH",
    allowedRoles: ["support", "super_admin"],
    fields: ["user_id", "reason"],
    required: ["user_id", "reason"],
    path: (fields) => `/admin/users/${segment(fields.user_id, "user_id")}`,
    redirectTo: (fields) => `/users/${segment(fields.user_id, "user_id")}`,
    body: (fields) => ({ payload: { action: "enable", reason: fields.reason.trim() } })
  },
  user_role_update: {
    method: "PATCH",
    allowedRoles: ["super_admin"],
    fields: ["user_id", "role", "reason"],
    required: ["user_id", "role", "reason"],
    enums: { role: userAssignableRoles },
    path: (fields) => `/admin/users/${segment(fields.user_id, "user_id")}`,
    redirectTo: (fields) => `/users/${segment(fields.user_id, "user_id")}`,
    body: (fields) => ({ payload: { action: "update_role", role: fields.role, reason: fields.reason.trim() } })
  },
  exercise_content_update: {
    method: "PATCH",
    allowedRoles: ["content_editor", "exercise_reviewer", "super_admin"],
    fields: ["exercise_id", "turkish_title", "turkish_instructions", "body_part", "equipment", "safety_tags", "restricted_regions", "substitution_id", "publish_state"],
    required: ["exercise_id"],
    enums: { publish_state: publishStates },
    path: (fields) => `/admin/exercises/${segment(fields.exercise_id, "exercise_id")}`,
    redirectTo: (fields) => `/exercises/${segment(fields.exercise_id, "exercise_id")}`,
    body: (fields) => ({
      payload: payload(fields, ["turkish_title", "turkish_instructions", "body_part", "equipment", "safety_tags", "restricted_regions", "substitution_id", "publish_state"])
    })
  },
  policy_draft_create: {
    method: "POST",
    allowedRoles: ["content_editor", "super_admin"],
    fields: ["version", "clinical_review_state"],
    required: ["version", "clinical_review_state"],
    enums: { clinical_review_state: clinicalReviewStates },
    path: () => "/admin/policies",
    redirectTo: () => "/policies",
    body: (fields) => ({ version: fields.version.trim(), clinical_review_state: fields.clinical_review_state, rules: { source: "admin_ui" } })
  },
  policy_draft_update: {
    method: "PATCH",
    allowedRoles: ["content_editor", "super_admin"],
    fields: ["policy_id", "status", "clinical_review_state"],
    required: ["policy_id", "status", "clinical_review_state"],
    enums: { status: policyStatuses, clinical_review_state: clinicalReviewStates },
    path: (fields) => `/admin/policies/${segment(fields.policy_id, "policy_id")}`,
    redirectTo: (fields) => `/policies/${segment(fields.policy_id, "policy_id")}`,
    body: (fields) => ({ payload: { status: fields.status, clinical_review_state: fields.clinical_review_state } })
  },
  policy_approve: policyAction("approve"),
  policy_reject: policyAction("reject"),
  policy_publish: policyAction("publish"),
  policy_rollback: policyAction("rollback"),
  privacy_job_action: {
    method: "POST",
    allowedRoles: ["support", "super_admin"],
    fields: ["kind", "job_id", "action", "rationale"],
    required: ["kind", "job_id", "action"],
    enums: { kind: privacyKinds, action: privacyActions },
    path: (fields) => `/admin/privacy-jobs/${segment(fields.kind, "kind")}/${segment(fields.job_id, "job_id")}/${segment(fields.action, "action")}`,
    redirectTo: () => "/privacy-jobs",
    body: (fields) => ({ payload: payload(fields, ["rationale"]) })
  },
  notification_retry: notificationAction("retry"),
  notification_cancel: notificationAction("cancel"),
  integration_disable: integrationAction("disable"),
  integration_retry_sync: integrationAction("retry-sync")
} satisfies Record<string, Operation>;

function policyAction(action: "approve" | "reject" | "publish" | "rollback"): Operation {
  const allowedRoles = action === "approve" || action === "reject" ? ["clinical_reviewer"] as const : ["super_admin"] as const;
  return {
    method: "POST",
    allowedRoles,
    fields: ["policy_id", "rationale"],
    required: ["policy_id", "rationale"],
    path: (fields) => `/admin/policies/${segment(fields.policy_id, "policy_id")}/${action}`,
    redirectTo: (fields) => `/policies/${segment(fields.policy_id, "policy_id")}`,
    body: (fields) => ({ rationale: fields.rationale.trim() })
  };
}

function notificationAction(action: "retry" | "cancel"): Operation {
  return {
    method: "POST",
    allowedRoles: action === "retry" ? ["analyst", "support", "super_admin"] : ["support", "super_admin"],
    fields: ["job_id"],
    required: ["job_id"],
    path: (fields) => `/admin/notifications/${segment(fields.job_id, "job_id")}/${action}`,
    redirectTo: () => "/notifications",
    body: () => ({})
  };
}

function integrationAction(action: "disable" | "retry-sync"): Operation {
  return {
    method: "POST",
    allowedRoles: action === "retry-sync" ? ["analyst", "super_admin"] : ["super_admin"],
    fields: ["connection_id"],
    required: ["connection_id"],
    path: (fields) => `/admin/integrations/${segment(fields.connection_id, "connection_id")}/${action}`,
    redirectTo: () => "/integrations",
    body: () => ({})
  };
}

function hasRole(admin: AdminIdentity, allowedRoles: readonly RequiredRole[]) {
  return allowedRoles.includes(admin.role);
}

async function loadAdmin(token: string) {
  const response = await fetch(`${apiBase}/api/v1/admin/auth/me`, {
    cache: "no-store",
    headers: { authorization: `Bearer ${token}` }
  }).catch(() => null);
  if (!response || !response.ok) return null;
  const data = (await response.json()) as { admin?: AdminIdentity };
  return data.admin ?? null;
}

function readFields(form: FormData) {
  const fields: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (reserved.has(key)) continue;
    if (typeof value !== "string") throw new Error("invalid_file_field");
    fields[key] = value;
  }
  return fields;
}

function validateFields(operation: Operation, fields: Record<string, string>) {
  const allowed = new Set(operation.fields);
  const unknown = Object.keys(fields).filter((field) => !allowed.has(field));
  if (unknown.length) throw new Error("unknown_fields");
  for (const field of operation.required ?? []) {
    if (!fields[field]?.trim()) throw new Error(`missing_${field}`);
  }
  for (const [field, values] of Object.entries(operation.enums ?? {})) {
    if (fields[field]?.trim() && !values.includes(fields[field].trim())) throw new Error(`invalid_${field}`);
  }
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const submitted = String(form.get("csrf") ?? request.headers.get("x-csrf-token") ?? "");
  const stored = request.cookies.get(csrfCookie)?.value ?? "";
  if (!stored || submitted !== stored) {
    return NextResponse.json({ code: "csrf_failed", message: "Mutation rejected.", details: {} }, { status: 403 });
  }

  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return adminRedirect(request, "/login?error=session_expired");

  const operationName = String(form.get("operation") ?? "");
  const operation = operations[operationName as keyof typeof operations];
  if (!operation) return adminRedirect(request, "/dashboard?error=invalid_mutation");

  const admin = await loadAdmin(token);
  if (!admin) return adminRedirect(request, "/login?error=session_expired");
  if (!hasRole(admin, operation.allowedRoles)) return adminRedirect(request, "/forbidden?error=insufficient_role");

  let fields: Record<string, string>;
  let path: string;
  let redirectTo: string;
  let body: unknown;
  try {
    fields = readFields(form);
    validateFields(operation, fields);
    path = operation.path(fields);
    redirectTo = operation.redirectTo(fields);
    body = operation.body(fields);
  } catch {
    return adminRedirect(request, "/dashboard?error=invalid_payload");
  }

  const response = await fetch(`${apiBase}/api/v1${path}`, {
    method: operation.method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body)
  }).catch(() => null);
  if (!response) return adminRedirect(request, `${redirectTo}?error=api_unavailable`);
  if (!response.ok) return adminRedirect(request, `${redirectTo}?error=mutation_failed_${response.status}`);
  return adminRedirect(request, `${redirectTo}?success=mutation_saved`);
}
