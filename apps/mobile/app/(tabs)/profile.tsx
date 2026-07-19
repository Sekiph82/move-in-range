import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { apiFetch, recordConsent, saveCapacityProfile, saveGoalsTargets, saveOnboardingStep, saveProfile } from "../../src/api";
import { useTheme } from "../../src/theme";

export default function ProfileScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [language, setLanguage] = useState<"en" | "tr">("en");
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => apiFetch<any>("/profile") });
  const onboarding = useQuery({ queryKey: ["onboarding"], queryFn: () => apiFetch<any>("/onboarding") });
  const save = useMutation({ mutationFn: () => saveProfile(language), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }) });
  const completeOnboarding = useMutation({
    mutationFn: async () => {
      await saveOnboardingStep("identity", { preferred_name: "Aylin", date_of_birth: "1982-04-20", gender: "prefer_not_to_say", timezone: "Europe/Istanbul", language }, true, language);
      await saveOnboardingStep("health_profile", { conditions: ["type_2_diabetes", "knee_condition"], clinician_prohibited_movements: [] }, true, language);
      await saveGoalsTargets(["mobility", "strength"], ["back", "core"], "20 minute back and core session");
      await saveCapacityProfile({ balance_level: "needs_support", floor_rise_capacity: "unable", walking_tolerance_minutes: 8 });
      await recordConsent("health_data_processing", true, { source: "mobile_onboarding" });
      return saveOnboardingStep("consent", { wellness_limitations: true, health_data_processing: true }, true, language);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  });
  const item = profile.data?.profile;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 28, fontWeight: "700" }}>Profile</Text>
      <Text style={{ color: theme.muted, fontSize: 16 }}>Health-aware onboarding and local development account.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[
          ["/auth", "Auth"],
          ["/onboarding", "Onboarding"],
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
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>Onboarding</Text>
        <Text style={{ color: theme.text }}>Name: {item?.preferred_name ?? "Not saved"}</Text>
        <Text style={{ color: theme.text }}>Language: {item?.language ?? item?.locale ?? language}</Text>
        <Text style={{ color: theme.text }}>Conditions: {(item?.conditions ?? []).join(", ") || "None saved"}</Text>
        <Text style={{ color: theme.text }}>Equipment: {(item?.equipment ?? []).join(", ") || "None saved"}</Text>
        <Text style={{ color: theme.text }}>Consent accepted: {item?.consent_accepted ? "yes" : "no"}</Text>
        <Text style={{ color: theme.text }}>Onboarding status: {onboarding.data?.progress?.status ?? "not loaded"}</Text>
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
      <Pressable accessibilityLabel="Save onboarding profile" onPress={() => save.mutate()} style={{ minHeight: 52, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.primary }}>
        <Text style={{ color: theme.surface, fontWeight: "700" }}>{save.isPending ? "Saving..." : "Save onboarding profile"}</Text>
      </Pressable>
      <Pressable accessibilityLabel="Complete guided onboarding sample" onPress={() => completeOnboarding.mutate()} style={{ minHeight: 52, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
        <Text style={{ color: theme.primary, fontWeight: "700" }}>{completeOnboarding.isPending ? "Saving steps..." : "Complete guided onboarding sample"}</Text>
      </Pressable>
      {save.error ? <Text style={{ color: theme.safety }}>{String(save.error.message)}</Text> : null}
      {completeOnboarding.error ? <Text style={{ color: theme.safety }}>{String(completeOnboarding.error.message)}</Text> : null}
    </ScrollView>
  );
}
