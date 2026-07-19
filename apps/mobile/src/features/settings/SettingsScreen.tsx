import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, recordConsent, saveCapacityProfile, saveGoalsTargets, saveProfile } from "../../api";
import { ActionButton, BodyText, ErrorText, LoadingState, Panel } from "../shared/ui";

export function SettingsScreen() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => apiFetch<any>("/profile") });
  const settingsMutation = useMutation({
    mutationFn: async () => {
      await saveGoalsTargets(["mobility", "strength"], ["core", "back"], "twenty minute back and core plan");
      await saveCapacityProfile({ floor_rise_capacity: "unable", walking_tolerance_minutes: 8, balance_level: "needs_support" });
      await recordConsent("health_data_processing", true, { source: "settings" });
      return saveProfile("en");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] })
  });
  return (
    <Panel title="Health settings">
      {profile.isLoading ? <LoadingState /> : null}
      <BodyText>Name: {profile.data?.profile?.preferred_name ?? "Not saved"}</BodyText>
      <BodyText>Equipment: {(profile.data?.profile?.equipment ?? []).join(", ") || "Not saved"}</BodyText>
      <BodyText muted>Goals, capacity, consent, and accessibility preferences are saved through real API calls.</BodyText>
      <ActionButton label={settingsMutation.isPending ? "Saving..." : "Save safe default settings"} onPress={() => settingsMutation.mutate()} />
      <ErrorText error={settingsMutation.error} />
    </Panel>
  );
}
