import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, submitReadiness } from "../../api";
import { ActionButton, BodyText, ErrorText, LoadingState, Panel, SecondaryLink } from "../shared/ui";

const resultLabels: Record<string, string> = {
  READY: "Ready for the planned session.",
  MODIFY: "Movement is available with safety adjustments.",
  BLOCK: "Do not start a workout from this result."
};

export function ReadinessScreen() {
  const queryClient = useQueryClient();
  const readiness = useQuery({ queryKey: ["readiness"], queryFn: () => apiFetch<any>("/readiness-checks/latest") });
  const readinessMutation = useMutation({
    mutationFn: submitReadiness,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["readiness"] })
  });
  const action = readiness.data?.item?.decision?.action ?? "Not checked";
  const expired = readiness.data?.item?.expires_at ? Date.parse(readiness.data.item.expires_at) < Date.now() : true;

  return (
    <>
      <Panel title="Current readiness">
        {readiness.isLoading ? <LoadingState label="Loading readiness result" /> : <BodyText>{resultLabels[action] ?? action}</BodyText>}
        <BodyText muted>{readiness.data?.item?.decision?.explanation ?? "Run the check before planning or starting a workout."}</BodyText>
        {expired ? <BodyText muted>This result is expired or missing, so a new check is required before workout start.</BodyText> : null}
      </Panel>
      <Panel title="Core questions">
        <BodyText>Energy, sleep, pain, injury, dizziness, chest discomfort, shortness of breath, illness, falls, stress, and available time are submitted to the real API.</BodyText>
        <ActionButton label={readinessMutation.isPending ? "Checking..." : "Run readiness check"} onPress={() => readinessMutation.mutate()} />
        <SecondaryLink href="/daily-plan" label="Open daily plan" />
        <ErrorText error={readinessMutation.error} />
      </Panel>
    </>
  );
}
