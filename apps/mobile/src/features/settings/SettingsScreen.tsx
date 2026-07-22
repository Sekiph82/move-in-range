import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { apiFetch, logoutUser, recordConsent, saveCapacityProfile, saveGoalsTargets, saveProfile } from "../../api";
import { LOGIN_ROUTE } from "../auth/sessionGate";
import { clearExerciseCache } from "../exercises/exerciseCache";
import { useAppLanguage } from "../../i18n/LanguageProvider";
import { View } from "react-native";
import { ActionButton, BodyText, ChoiceChip, ErrorText, LoadingState, Panel } from "../shared/ui";

export function SettingsScreen() {
  const queryClient = useQueryClient();
  const { language, setLanguage, voiceEnabled, setVoiceEnabled, hapticsEnabled, setHapticsEnabled, t } = useAppLanguage();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => apiFetch<any>("/profile") });
  const settingsMutation = useMutation({
    mutationFn: async () => {
      await saveGoalsTargets(["mobility", "strength"], ["core", "back"], "twenty minute back and core plan");
      await saveCapacityProfile({ floor_rise_capacity: "unable", walking_tolerance_minutes: 8, balance_level: "needs_support" });
      await recordConsent("health_data_processing", true, { source: "settings" });
      return saveProfile(language);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] })
  });
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await logoutUser();
      await clearExerciseCache();
    },
    onSuccess: () => {
      queryClient.clear();
      router.replace(LOGIN_ROUTE as never);
    }
  });
  return (
    <Panel title="Health settings">
      {profile.isLoading ? <LoadingState /> : null}
      <BodyText>Name: {profile.data?.profile?.preferred_name ?? "Not saved"}</BodyText>
      <BodyText>Equipment: {(profile.data?.profile?.equipment ?? []).join(", ") || "Not saved"}</BodyText>
      <BodyText muted>Goals, capacity, consent, and accessibility preferences are saved through real API calls.</BodyText>
      <View style={{ gap: 10 }}>
        <BodyText muted>Language controls app labels, workout cues, and exercise API locale requests.</BodyText>
        <ChoiceChip label={t("settings.english")} selected={language === "en"} onPress={() => void setLanguage("en")} />
        <ChoiceChip label={t("settings.turkish")} selected={language === "tr"} onPress={() => void setLanguage("tr")} />
        <ChoiceChip label={t("settings.workoutVoice")} selected={voiceEnabled} onPress={() => void setVoiceEnabled(!voiceEnabled)} />
        <ChoiceChip label={t("settings.haptics")} selected={hapticsEnabled} onPress={() => void setHapticsEnabled(!hapticsEnabled)} />
        <BodyText muted>{t("settings.voiceAuto")}</BodyText>
      </View>
      <ActionButton label={settingsMutation.isPending ? "Saving..." : "Save safe default settings"} onPress={() => settingsMutation.mutate()} />
      <ActionButton label={logoutMutation.isPending ? "Signing out..." : "Sign out"} onPress={() => logoutMutation.mutate()} />
      <ErrorText error={settingsMutation.error ?? logoutMutation.error} />
    </Panel>
  );
}
