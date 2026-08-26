export type ReadinessAction = "READY" | "READY_WITH_MODIFICATIONS" | "MODIFY" | "DELAY_AND_RECHECK" | "BLOCK_AND_SHOW_SAFETY_MESSAGE" | "BLOCK" | string;

export function localDateKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function readinessCreatedToday(item: any, now = new Date()) {
  const value = item?.created_at ?? item?.checked_at ?? item?.submitted_at;
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return localDateKey(date) === localDateKey(now);
}

export function readinessExpired(item: any, nowMs = Date.now()) {
  return item?.expires_at ? Date.parse(item.expires_at) < nowMs : false;
}

export function readinessAction(item: any): ReadinessAction | undefined {
  return item?.decision?.action ?? item?.decision_action ?? item?.action;
}

export function readinessAllowsStart(item: any) {
  const action = readinessAction(item);
  return action === "READY" || action === "READY_WITH_MODIFICATIONS" || action === "MODIFY";
}

export function readinessRequiresAcknowledgement(item: any) {
  const action = readinessAction(item);
  return action === "READY_WITH_MODIFICATIONS" || action === "MODIFY";
}

export function readinessBlocksStart(item: any) {
  const action = readinessAction(item);
  return action === "BLOCK_AND_SHOW_SAFETY_MESSAGE" || action === "BLOCK";
}

export function readinessDelaysStart(item: any) {
  return readinessAction(item) === "DELAY_AND_RECHECK";
}

export function hasValidSameDayReadiness(item: any, now = new Date()) {
  return Boolean(item) && readinessCreatedToday(item, now) && !readinessExpired(item, now.getTime());
}

export function workoutStartLabel(item: any) {
  if (!hasValidSameDayReadiness(item)) return "Check readiness & start";
  if (readinessRequiresAcknowledgement(item)) return "Review adjustments";
  if (readinessDelaysStart(item)) return "Recheck readiness";
  return "Start guided session";
}
