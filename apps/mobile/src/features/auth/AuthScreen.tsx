import { useMutation } from "@tanstack/react-query";
import { saveProfile } from "../../api";
import { ActionButton, BodyText, ErrorText, Panel, SecondaryLink } from "../shared/ui";

export function AuthScreen() {
  const authMutation = useMutation({ mutationFn: () => saveProfile("en") });
  return (
    <Panel title="Demo session">
      <BodyText muted>The app signs into the local API demo account, then stores tokens in SecureStore when available.</BodyText>
      <ActionButton label={authMutation.isPending ? "Starting..." : "Start local session"} onPress={() => authMutation.mutate()} />
      <SecondaryLink href="/onboarding" label="Continue to onboarding" />
      <ErrorText error={authMutation.error} />
    </Panel>
  );
}
