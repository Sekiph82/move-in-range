import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../api";
import { ActionButton, BodyText, ErrorText, LoadingState, Panel } from "../shared/ui";

export function PrivacyScreen() {
  const queryClient = useQueryClient();
  const exportJobs = useQuery({ queryKey: ["privacy-exports"], queryFn: () => apiFetch<any>("/privacy/export-jobs") });
  const deletionJobs = useQuery({ queryKey: ["privacy-deletions"], queryFn: () => apiFetch<any>("/privacy/deletion-jobs") });
  const exportMutation = useMutation({ mutationFn: () => apiFetch("/privacy/export-jobs", { method: "POST" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["privacy-exports"] }) });
  const deletionMutation = useMutation({
    mutationFn: () => apiFetch("/privacy/deletion-jobs", { method: "POST", body: JSON.stringify({ payload: { deletion_type: "selected_health_data", confirmation: "user_confirmed", reauthentication: "required_before_processing" } }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["privacy-deletions"] })
  });
  const downloadUrl = (exportMutation.data as any)?.job?.download_url;
  const downloadMutation = useMutation({ mutationFn: () => apiFetch(String(downloadUrl).replace(/^\/api\/v1/, "")) });
  return (
    <Panel title="Data rights">
      <BodyText>Export and deletion requests require explicit confirmation, progress state, and audit records.</BodyText>
      <ActionButton label={exportMutation.isPending ? "Creating..." : "Request export"} onPress={() => exportMutation.mutate()} />
      <ActionButton tone="safety" label={deletionMutation.isPending ? "Requesting..." : "Request selected deletion"} onPress={() => deletionMutation.mutate()} />
      {downloadUrl ? <ActionButton label={downloadMutation.isPending ? "Downloading..." : "Download latest export"} onPress={() => downloadMutation.mutate()} /> : null}
      {(downloadMutation.data as any)?.checksum_sha256 ? <BodyText>Archive checksum: {(downloadMutation.data as any).checksum_sha256}</BodyText> : null}
      {exportJobs.isLoading || deletionJobs.isLoading ? <LoadingState /> : null}
      {(exportJobs.data?.items ?? []).map((item: any) => <BodyText key={item.id}>Export {item.id}: {item.status}</BodyText>)}
      {(deletionJobs.data?.items ?? []).map((item: any) => <BodyText key={item.id}>Deletion {item.id}: {item.status}</BodyText>)}
      <ErrorText error={exportMutation.error ?? deletionMutation.error ?? downloadMutation.error} />
    </Panel>
  );
}
