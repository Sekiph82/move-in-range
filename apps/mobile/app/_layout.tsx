import { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../src/theme";
import { SessionGuard } from "../src/features/auth/SessionGuard";
import { LanguageProvider } from "../src/i18n/LanguageProvider";
import { logDevelopmentApiDiagnostics, probeApiHealth } from "../src/api";

const queryClient = new QueryClient();

function ApiDiagnosticsProbe() {
  useEffect(() => {
    let active = true;
    probeApiHealth(4000)
      .then(() => {
        if (active) logDevelopmentApiDiagnostics("ok");
      })
      .catch(() => {
        if (active) logDevelopmentApiDiagnostics("failed");
      });
    return () => {
      active = false;
    };
  }, []);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <ApiDiagnosticsProbe />
            <SessionGuard />
            <Stack screenOptions={{ headerShown: false }} />
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
