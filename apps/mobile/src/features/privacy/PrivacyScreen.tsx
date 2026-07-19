import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../api";
import { ActionButton, BodyText, ErrorText, LoadingState, Panel } from "../shared/ui";

export function PrivacyScreen() {
  const queryClient = useQueryClient();
  const exportJobs = useQuery({ queryKey: ["privacy-exports"], queryFn: () => apiFetch<any>("/privacy/export-jobs") });
  const exportMutation = useMutation({ mutationFn: () => apiFetch("/privacy/export-jobs", { method: "POST" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["privacy-exports"] }) });
  const deletionMutation = useMutation({
    mutationFn: () => apiFetch("/privacy/deletion-jobs", { method: "POST", body: JSON.stringify({ payload: { deletion_type: "selected_health_data", confirmation: "user_confirmed", reauthentication: "required_before_processing" } }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["privacy-exports"] })
  });
  return (
    <Panel title="Data rights">
      <BodyText>Export and deletion requests require explicit confirmation, progress state, and audit records.</BodyText>
      <ActionButton label={exportMutation.isPending ? "Creating..." : "Request export"} onPress={() => exportMutation.mutate()} />
      <ActionButton tone="safety" label={deletionMutation.isPending ? "Requesting..." : "Request selected deletion"} onPress={() => deletionMutation.mutate()} />
      {exportJobs.isLoading ? <LoadingState /> : null}
      {(exportJobs.data?.items ?? []).map((item: any) => <BodyText key={item.id}>Export {item.id}: {item.status}</BodyText>)}
      <ErrorText error={exportMutation.error ?? deletionMutation.error} />
    </Panel>
  );
}
