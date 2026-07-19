import { useEffect, useState, type ReactNode } from "react";
import { router, usePathname } from "expo-router";
import { getSessionSnapshot } from "../../api";
import { LoadingState } from "../shared/ui";
import { resolveSessionGate, type SessionGateDecision } from "./sessionGate";

export function SessionGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [decision, setDecision] = useState<SessionGateDecision>({ state: "BOOTSTRAPPING" });

  useEffect(() => {
    let active = true;
    setDecision({ state: "BOOTSTRAPPING" });
    getSessionSnapshot()
      .then((snapshot) => {
        if (!active) return;
        const next = resolveSessionGate(pathname, snapshot);
        setDecision(next);
        if (next.redirectTo) router.replace(next.redirectTo as never);
      })
      .catch(() => {
        if (!active) return;
        const next = resolveSessionGate(pathname, { hasSession: false, onboardingComplete: false, sessionExpired: true });
        setDecision(next);
        if (next.redirectTo) router.replace(next.redirectTo as never);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  if (decision.state === "BOOTSTRAPPING") return <LoadingState label="Checking secure session" />;
  return <>{children}</>;
}
