import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, connectProvider } from "../../api";
import { ActionButton, BodyText, ErrorText, LoadingState, Panel } from "../shared/ui";

export function IntegrationsScreen() {
  const queryClient = useQueryClient();
  const providers = useQuery({ queryKey: ["providers"], queryFn: () => apiFetch<any>("/integrations/providers") });
  const providerMutation = useMutation({ mutationFn: (key: string) => connectProvider(key, true), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["providers"] }) });
  return (
    <Panel title="Providers">
      {providers.isLoading ? <LoadingState /> : null}
      {(providers.data?.items ?? []).map((provider: any) => {
        const sandbox = provider.status === "mock_ready" || provider.status === "mock_connected";
        return (
          <Panel key={provider.key} title={`${provider.name ?? provider.key}${sandbox ? " - Sandbox" : ""}`}>
            <BodyText>Category: {provider.category}</BodyText>
            <BodyText>Status: {provider.status}</BodyText>
            <BodyText>Permissions: {(provider.scopes ?? []).join(", ") || "None requested"}</BodyText>
            <BodyText muted>{sandbox ? "Sandbox sync is available for local validation." : "External developer credentials are required before activation."}</BodyText>
            <ActionButton label={`Connect ${provider.key}`} disabled={!sandbox} onPress={() => providerMutation.mutate(provider.key)} />
          </Panel>
        );
      })}
      <ErrorText error={providerMutation.error} />
    </Panel>
  );
}
