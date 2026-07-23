import { Pressable, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, router } from "expo-router";
import { apiFetch, logoutUser } from "../../src/api";
import { LOGIN_ROUTE } from "../../src/features/auth/sessionGate";
import { clearExerciseCache } from "../../src/features/exercises/exerciseCache";
import { useAppLanguage } from "../../src/i18n/LanguageProvider";
import { useTheme } from "../../src/theme";

export default function ProfileScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { language, setLanguage, t } = useAppLanguage();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => apiFetch<any>("/profile") });
  const onboarding = useQuery({ queryKey: ["onboarding"], queryFn: () => apiFetch<any>("/onboarding") });
  const logout = useMutation({
    mutationFn: async () => {
      await logoutUser();
      await clearExerciseCache();
    },
    onSuccess: () => {
      queryClient.clear();
      router.replace(LOGIN_ROUTE as never);
    }
  });
  const item = profile.data?.profile;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 28, fontWeight: "700" }}>Profile</Text>
      <Text style={{ color: theme.muted, fontSize: 16 }}>Account, movement profile, settings, privacy, and connected tools.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[
          ["/onboarding-edit", "Movement profile"],
          ["/settings", "Settings"],
          ["/integrations", "Integrations"],
          ["/notifications", "Notifications"],
          ["/privacy", "Privacy"],
          ["/caregivers", "Caregivers"],
          ["/professionals", "Professionals"]
        ].map(([href, label]) => (
          <Link key={href} href={href as never} asChild>
            <Pressable accessibilityRole="link" style={{ minHeight: 40, borderRadius: 8, borderColor: theme.border, borderWidth: 1, paddingHorizontal: 12, justifyContent: "center", backgroundColor: theme.surface }}>
              <Text style={{ color: theme.primary, fontWeight: "700" }}>{label}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>Movement profile</Text>
        <Text style={{ color: theme.text }}>Name: {item?.preferred_name ?? "Not saved"}</Text>
        <Text style={{ color: theme.text }}>Language: {item?.language ?? item?.locale ?? language}</Text>
        <Text style={{ color: theme.text }}>Conditions: {(item?.conditions ?? []).join(", ") || "None saved"}</Text>
        <Text style={{ color: theme.text }}>Equipment: {(item?.equipment ?? []).join(", ") || "None saved"}</Text>
        <Text style={{ color: theme.text }}>Consent accepted: {item?.consent_accepted ? "yes" : "no"}</Text>
        <Text style={{ color: theme.text }}>Onboarding status: {onboarding.data?.progress?.status ?? "No saved onboarding draft yet"}</Text>
        <Text style={{ color: theme.muted }}>MoveInRange is a wellness tool; it does not diagnose, change medication guidance, or provide insulin-dose guidance.</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable accessibilityLabel="Use English" onPress={() => setLanguage("en")} style={{ minHeight: 48, flex: 1, justifyContent: "center", alignItems: "center", borderRadius: 8, backgroundColor: language === "en" ? theme.primary : theme.surface, borderColor: theme.border, borderWidth: 1 }}>
          <Text style={{ color: language === "en" ? theme.surface : theme.text, fontWeight: "700" }}>English</Text>
        </Pressable>
        <Pressable accessibilityLabel="Use Turkish" onPress={() => setLanguage("tr")} style={{ minHeight: 48, flex: 1, justifyContent: "center", alignItems: "center", borderRadius: 8, backgroundColor: language === "tr" ? theme.primary : theme.surface, borderColor: theme.border, borderWidth: 1 }}>
          <Text style={{ color: language === "tr" ? theme.surface : theme.text, fontWeight: "700" }}>Turkish</Text>
        </Pressable>
      </View>
      <Pressable accessibilityLabel="Log out" onPress={() => logout.mutate()} style={{ minHeight: 52, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
        <Text style={{ color: theme.safety, fontWeight: "900" }}>{logout.isPending ? "Signing out..." : "Log out"}</Text>
      </Pressable>
      <Text style={{ color: theme.muted }}>{t("settings.language")}: {language === "tr" ? t("settings.turkish") : t("settings.english")}</Text>
      {logout.error ? <Text style={{ color: theme.safety }}>{String(logout.error.message)}</Text> : null}
    </ScrollView>
  );
}
