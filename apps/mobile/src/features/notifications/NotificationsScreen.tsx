import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, saveNotificationPreference } from "../../api";
import { ActionButton, BodyText, ErrorText, LoadingState, Panel } from "../shared/ui";

export function NotificationsScreen() {
  const queryClient = useQueryClient();
  const notificationPrefs = useQuery({ queryKey: ["notifications"], queryFn: () => apiFetch<any>("/notification-preferences") });
  const notificationMutation = useMutation({
    mutationFn: () => saveNotificationPreference("workout_reminder", true),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });
  return (
    <Panel title="Preferences">
      {notificationPrefs.isLoading ? <LoadingState /> : null}
      {(notificationPrefs.data?.items ?? []).map((item: any) => <BodyText key={item.id}>{item.category}: {item.enabled ? "enabled" : "off"} - {item.channel}</BodyText>)}
      <BodyText muted>Quiet hours, preview privacy, permission state, and local test availability are saved as auditable preferences.</BodyText>
      <ActionButton label={notificationMutation.isPending ? "Saving..." : "Enable workout reminders"} onPress={() => notificationMutation.mutate()} />
      <ErrorText error={notificationMutation.error} />
    </Panel>
  );
}
