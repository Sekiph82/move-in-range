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

export const LOGIN_ROUTE = "/auth/login";
export const REGISTER_ROUTE = "/auth/register";
export const ONBOARDING_ROUTE = "/onboarding";
export const TABS_ROUTE = "/(tabs)";

export function resolveSessionGate(pathname: string, snapshot: { hasSession: boolean; onboardingComplete: boolean; sessionExpired?: boolean; offline?: boolean; bootstrapping?: boolean }): SessionGateDecision {
  if (snapshot.bootstrapping) return { state: "BOOTSTRAPPING" };
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const onAuthRoute = normalizedPathname.startsWith("/auth");
  const onOnboarding = normalizedPathname === ONBOARDING_ROUTE;
  if (snapshot.sessionExpired) return { state: "SESSION_EXPIRED", redirectTo: onAuthRoute ? undefined : LOGIN_ROUTE };
  if (!snapshot.hasSession) return { state: "SIGNED_OUT", redirectTo: onAuthRoute ? undefined : LOGIN_ROUTE };
  if (snapshot.offline) return { state: "OFFLINE_WITH_VALID_SESSION" };
  if (!snapshot.onboardingComplete) return { state: "AUTHENTICATED_ONBOARDING_INCOMPLETE", redirectTo: onOnboarding ? undefined : ONBOARDING_ROUTE };
  return { state: "AUTHENTICATED_READY", redirectTo: onAuthRoute || onOnboarding ? TABS_ROUTE : undefined };
}
