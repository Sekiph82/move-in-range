type ReadinessStartContext = {
  planId?: string | null;
  source?: "home" | "today" | "week" | "month" | "preview" | string;
  sessionDate?: string | null;
  selectedDay?: string | null;
  sessionType?: string | null;
  returnTo?: string | null;
};

export function readinessStartHref(context: ReadinessStartContext = {}) {
  const params = new URLSearchParams({ intent: "start" });
  for (const [key, value] of Object.entries(context)) {
    if (value) params.set(key, String(value));
  }
  return `/readiness?${params.toString()}`;
}

export function workoutHref(sessionId: string, context: ReadinessStartContext = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(context)) {
    if (value) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `/workout/${sessionId}?${query}` : `/workout/${sessionId}`;
}
