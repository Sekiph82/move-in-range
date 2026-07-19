import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, connectProvider } from "../../api";
import { ActionButton, BodyText, ErrorText, LoadingState, Panel } from "../shared/ui";

const stateLabel: Record<string, string> = {
  mock_ready: "Sandbox",
  mock_connected: "Connected sandbox",
  blocked_credentials: "Credentials required",
  blocked_platform_entitlement: "Credentials required",
  blocked_device: "Unsupported on this device",
  blocked_hardware: "Unsupported on this device",
  disconnected: "Available"
};

export function IntegrationsScreen() {
  const queryClient = useQueryClient();
  const providers = useQuery({ queryKey: ["providers"], queryFn: () => apiFetch<any>("/integrations/providers") });
  const providerMutation = useMutation({ mutationFn: (key: string) => connectProvider(key, true), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["providers"] }) });
  return (
    <Panel title="Providers">
      {providers.isLoading ? <LoadingState /> : null}
      {(providers.data?.items ?? []).map((provider: any) => {
        const sandbox = provider.status === "mock_ready" || provider.status === "mock_connected";
        const name = provider.name ?? String(provider.key).replaceAll("_", " ");
        return (
          <Panel key={provider.key} title={name}>
            <BodyText>Category: {provider.category}</BodyText>
            <BodyText>Status: {stateLabel[provider.status] ?? "Coming later"}</BodyText>
            <BodyText>Permissions: {(provider.scopes ?? []).join(", ") || "None requested"}</BodyText>
            <BodyText muted>{sandbox ? "Sandbox sync is available for local validation." : "External developer credentials are required before activation."}</BodyText>
            <ActionButton label={sandbox ? `Connect ${name}` : "Connection unavailable"} disabled={!sandbox} onPress={() => providerMutation.mutate(provider.key)} />
          </Panel>
        );
      })}
      <ErrorText error={providerMutation.error} />
    </Panel>
  );
}
