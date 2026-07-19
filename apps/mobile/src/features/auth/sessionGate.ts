export type SessionGateState =
  | "BOOTSTRAPPING"
  | "SIGNED_OUT"
  | "AUTHENTICATED_ONBOARDING_INCOMPLETE"
  | "AUTHENTICATED_READY"
  | "SESSION_EXPIRED"
  | "OFFLINE_WITH_VALID_SESSION";

export type SessionGateDecision = {
  state: SessionGateState;
  redirectTo?: string;
};

export function resolveSessionGate(pathname: string, snapshot: { hasSession: boolean; onboardingComplete: boolean; sessionExpired?: boolean; offline?: boolean; bootstrapping?: boolean }): SessionGateDecision {
  if (snapshot.bootstrapping) return { state: "BOOTSTRAPPING" };
  const onAuthRoute = pathname.startsWith("/auth");
  const onOnboarding = pathname === "/onboarding";
  if (snapshot.sessionExpired) return { state: "SESSION_EXPIRED", redirectTo: onAuthRoute ? undefined : "/auth/session-expired" };
  if (!snapshot.hasSession) return { state: "SIGNED_OUT", redirectTo: onAuthRoute ? undefined : "/auth/login" };
  if (snapshot.offline) return { state: "OFFLINE_WITH_VALID_SESSION" };
  if (!snapshot.onboardingComplete) return { state: "AUTHENTICATED_ONBOARDING_INCOMPLETE", redirectTo: onOnboarding ? undefined : "/onboarding" };
  return { state: "AUTHENTICATED_READY", redirectTo: onAuthRoute || onOnboarding ? "/(tabs)" : undefined };
}
