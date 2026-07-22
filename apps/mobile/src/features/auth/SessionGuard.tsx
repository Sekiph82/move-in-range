import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router, usePathname, useRootNavigationState } from "expo-router";
import { getSessionSnapshot } from "../../api";
import { useTheme } from "../../theme";
import { resolveSessionGate } from "./sessionGate";

export function SessionGuard() {
  const theme = useTheme();
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();
  const rootNavigationReady = Boolean(rootNavigationState?.key);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!rootNavigationReady) return;
    let active = true;
    setChecking(true);
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
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [pathname, rootNavigationReady]);

  if (!checking) return null;
  return (
    <View pointerEvents="auto" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, backgroundColor: theme.background, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <ActivityIndicator />
      <Text accessibilityRole="text" style={{ color: theme.muted, fontWeight: "700" }}>Restoring secure session...</Text>
    </View>
  );
}
