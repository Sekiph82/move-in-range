import { useEffect } from "react";
import { router, usePathname, useRootNavigationState } from "expo-router";
import { getSessionSnapshot } from "../../api";
import { resolveSessionGate } from "./sessionGate";

export function SessionGuard() {
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();
  const rootNavigationReady = Boolean(rootNavigationState?.key);

  useEffect(() => {
    if (!rootNavigationReady) return;
    let active = true;
    getSessionSnapshot()
      .then((snapshot) => {
        if (!active) return;
        const next = resolveSessionGate(pathname, snapshot);
        if (next.redirectTo) router.replace(next.redirectTo as never);
      })
      .catch(() => {
        if (!active) return;
        const next = resolveSessionGate(pathname, { hasSession: false, onboardingComplete: false, sessionExpired: true });
        if (next.redirectTo) router.replace(next.redirectTo as never);
      });
    return () => {
      active = false;
    };
  }, [pathname, rootNavigationReady]);

  return null;
}
