export type ProviderState = {
  key: string;
  category: "cgm" | "health_platform" | "wearable";
  status: "mock_ready" | "mock_connected" | "blocked_credentials" | "blocked_platform_entitlement" | "blocked_device" | "blocked_hardware" | "disconnected";
  scopes: string[];
};

export function canActivateProvider(provider: ProviderState): boolean {
  return provider.status === "mock_ready" || provider.status === "mock_connected";
}

export function providerBlockedReason(provider: ProviderState): string | null {
  if (provider.status === "blocked_credentials") return "Developer account or API credentials are required.";
  if (provider.status === "blocked_platform_entitlement") return "Native platform entitlement and device validation are required.";
  if (provider.status === "blocked_device") return "A real device is required for validation.";
  if (provider.status === "blocked_hardware") return "Sensor hardware is required for validation.";
  return null;
}
