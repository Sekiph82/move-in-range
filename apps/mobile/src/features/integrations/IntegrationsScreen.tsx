import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";
import { apiFetch, connectProvider, disconnectProvider, testProviderConnection } from "../../api";
import { ActionButton, BodyText, ErrorText, LoadingState, Panel, TextField } from "../shared/ui";

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
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [nightscoutUrl, setNightscoutUrl] = useState("");
  const [nightscoutSecret, setNightscoutSecret] = useState("");
  const [notice, setNotice] = useState("");
  const providers = useQuery({ queryKey: ["providers"], queryFn: () => apiFetch<any>("/integrations/providers") });
  const providerMutation = useMutation({
    mutationFn: (key: string) => connectProvider(key, key !== "nightscout", key === "nightscout" ? { server_url: nightscoutUrl, secret_present: Boolean(nightscoutSecret) } : {}),
    onSuccess: async () => {
      setNotice("Connection state saved.");
      await queryClient.invalidateQueries({ queryKey: ["providers"] });
    }
  });
  const testMutation = useMutation({
    mutationFn: () => testProviderConnection("nightscout", { server_url: nightscoutUrl, secret_present: Boolean(nightscoutSecret) }),
    onSuccess: () => setNotice("Nightscout configuration is reachable enough to save.")
  });
  const disconnectMutation = useMutation({
    mutationFn: (id: number) => disconnectProvider(id),
    onSuccess: async () => {
      setNotice("Disconnected.");
      await queryClient.invalidateQueries({ queryKey: ["providers"] });
    }
  });
  return (
    <Panel title="Providers">
      {providers.isLoading ? <LoadingState /> : null}
      {(providers.data?.items ?? []).map((provider: any) => {
        const sandbox = provider.status === "mock_ready" || provider.status === "mock_connected";
        const name = provider.name ?? String(provider.key).replaceAll("_", " ");
        const selected = selectedProvider === provider.key;
        const unsupported = ["blocked_device", "blocked_hardware"].includes(provider.status);
        const configurationRequired = ["blocked_credentials", "blocked_platform_entitlement"].includes(provider.status);
        return (
          <Panel key={provider.key} title={name}>
            <BodyText>Category: {provider.category}</BodyText>
            <BodyText>Status: {stateLabel[provider.status] ?? "Coming later"}</BodyText>
            <BodyText>Permissions: {(provider.scopes ?? []).join(", ") || "None requested"}</BodyText>
            <BodyText muted>{provider.key === "nightscout" ? "Configure your server, test, then save. Secrets are not displayed." : unsupported ? "This provider is not supported on this device." : configurationRequired ? "Project credentials or platform entitlements are required before connection." : "Connection can be started from this card."}</BodyText>
            {provider.key === "nightscout" && selected ? (
              <View style={{ gap: 10 }}>
                <TextField label="Nightscout server URL" value={nightscoutUrl} onChangeText={setNightscoutUrl} />
                <TextField label="Access token or API secret" value={nightscoutSecret} onChangeText={setNightscoutSecret} secureTextEntry />
                <ActionButton label={testMutation.isPending ? "Testing..." : "Test connection"} disabled={!nightscoutUrl || testMutation.isPending} onPress={() => testMutation.mutate()} />
                <ActionButton label={providerMutation.isPending ? "Saving..." : "Save connection"} disabled={!nightscoutUrl || providerMutation.isPending} onPress={() => providerMutation.mutate(provider.key)} />
              </View>
            ) : null}
            {!selected ? <ActionButton label={provider.key === "nightscout" ? "Configure Nightscout" : sandbox ? `Connect ${name}` : "View requirements"} disabled={unsupported} onPress={() => provider.key === "nightscout" || configurationRequired ? setSelectedProvider(provider.key) : providerMutation.mutate(provider.key)} /> : null}
            {provider.connection_id ? <ActionButton label="Disconnect" onPress={() => disconnectMutation.mutate(provider.connection_id)} /> : null}
          </Panel>
        );
      })}
      {notice ? <BodyText muted>{notice}</BodyText> : null}
      <ErrorText error={providerMutation.error ?? testMutation.error ?? disconnectMutation.error} />
    </Panel>
  );
}
