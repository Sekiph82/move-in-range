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

function listPayload(fields: Record<string, string>, name: string) {
  return (fields[name] ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
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
  exercise_translation_update: {
    method: "PATCH",
    allowedRoles: ["content_editor", "super_admin"],
    fields: ["exercise_id", "locale", "title", "instruction_steps", "form_cues", "common_mistakes", "breathing_cues", "change_reason"],
    required: ["exercise_id", "locale", "title", "instruction_steps", "change_reason"],
    enums: { locale: ["tr"] },
    path: (fields) => `/admin/exercises/${segment(fields.exercise_id, "exercise_id")}/translation`,
    redirectTo: (fields) => `/exercises/${segment(fields.exercise_id, "exercise_id")}`,
    body: (fields) => ({
      locale: fields.locale.trim(),
      title: fields.title.trim(),
      instruction_steps: listPayload(fields, "instruction_steps"),
      form_cues: listPayload(fields, "form_cues"),
      common_mistakes: listPayload(fields, "common_mistakes"),
      breathing_cues: listPayload(fields, "breathing_cues"),
      change_reason: fields.change_reason.trim()
    })
  },
  exercise_metadata_update: {
    method: "PATCH",
    allowedRoles: ["content_editor", "super_admin"],
    fields: ["exercise_id", "category", "equipment", "position", "difficulty", "change_reason"],
    required: ["exercise_id", "change_reason"],
    path: (fields) => `/admin/exercises/${segment(fields.exercise_id, "exercise_id")}/metadata`,
    redirectTo: (fields) => `/exercises/${segment(fields.exercise_id, "exercise_id")}`,
    body: (fields) => ({ ...payload(fields, ["category", "equipment", "position", "difficulty"]), change_reason: fields.change_reason.trim() })
  },
  exercise_safety_update: {
    method: "PATCH",
    allowedRoles: ["exercise_reviewer", "super_admin"],
    fields: ["exercise_id", "safety_tags", "restricted_regions", "contraindication_categories", "review_reason"],
    required: ["exercise_id", "review_reason"],
    path: (fields) => `/admin/exercises/${segment(fields.exercise_id, "exercise_id")}/safety`,
    redirectTo: (fields) => `/exercises/${segment(fields.exercise_id, "exercise_id")}`,
    body: (fields) => ({
      safety_tags: listPayload(fields, "safety_tags"),
      restricted_regions: listPayload(fields, "restricted_regions"),
      contraindication_categories: listPayload(fields, "contraindication_categories"),
      review_reason: fields.review_reason.trim()
    })
  },
  exercise_substitution_add: exerciseSubstitutionAction("add"),
  exercise_substitution_remove: exerciseSubstitutionAction("remove"),
  exercise_publish: exercisePublicationAction("publish"),
  exercise_unpublish: exercisePublicationAction("unpublish"),
  policy_submit: policyAction("submit"),
  policy_approve: policyAction("approve"),
  policy_reject: policyAction("reject"),
  policy_publish: policyAction("publish"),
  policy_rollback: policyAction("rollback"),
  policy_draft_create: {
    method: "POST",
    allowedRoles: ["content_editor", "super_admin"],
    fields: ["version"],
    required: ["version"],
    path: () => "/admin/policies",
    redirectTo: () => "/policies",
    body: (fields) => ({ version: fields.version.trim(), rules: { source: "admin_ui" } })
  },
  policy_draft_update: {
    method: "PATCH",
    allowedRoles: ["content_editor", "super_admin"],
    fields: ["policy_id", "change_reason"],
    required: ["policy_id", "change_reason"],
    path: (fields) => `/admin/policies/${segment(fields.policy_id, "policy_id")}`,
    redirectTo: (fields) => `/policies/${segment(fields.policy_id, "policy_id")}`,
    body: (fields) => ({ payload: { rules: { source: "admin_ui", change_reason: fields.change_reason.trim() } } })
  },
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

function exerciseSubstitutionAction(action: "add" | "remove"): Operation {
  return {
    method: "POST",
    allowedRoles: ["exercise_reviewer", "super_admin"],
    fields: ["exercise_id", "substitution_id", "reason"],
    required: ["exercise_id", "substitution_id", "reason"],
    path: (fields) => `/admin/exercises/${segment(fields.exercise_id, "exercise_id")}/substitutions${action === "remove" ? "/remove" : ""}`,
    redirectTo: (fields) => `/exercises/${segment(fields.exercise_id, "exercise_id")}`,
    body: (fields) => ({ substitution_id: fields.substitution_id.trim(), reason: fields.reason.trim() })
  };
}

function exercisePublicationAction(action: "publish" | "unpublish"): Operation {
  return {
    method: "POST",
    allowedRoles: ["exercise_reviewer", "super_admin"],
    fields: ["exercise_id", "reason"],
    required: ["exercise_id", "reason"],
    path: (fields) => `/admin/exercises/${segment(fields.exercise_id, "exercise_id")}/${action}`,
    redirectTo: (fields) => `/exercises/${segment(fields.exercise_id, "exercise_id")}`,
    body: (fields) => ({ reason: fields.reason.trim() })
  };
}

function policyAction(action: "submit" | "approve" | "reject" | "publish" | "rollback"): Operation {
  const allowedRoles = action === "submit" ? ["content_editor", "super_admin"] as const : action === "approve" || action === "reject" ? ["clinical_reviewer"] as const : ["super_admin"] as const;
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
