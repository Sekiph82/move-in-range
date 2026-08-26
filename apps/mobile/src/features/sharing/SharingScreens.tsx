import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { inviteCaregiver, inviteProfessional } from "../../api";
import { ActionButton, BodyText, ChipGroup, ErrorText, Panel, TextField } from "../shared/ui";

export function CaregiversScreen() {
  const [email, setEmail] = useState("care@moveinrange.local");
  const [scopes, setScopes] = useState(["weekly_summary"]);
  const mutation = useMutation({ mutationFn: () => inviteCaregiver(email, scopes) });
  return (
    <Panel title="Caregiver invite">
      <TextField label="Invite email" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <ChipGroup labels={["weekly_summary", "achievement_status", "calendar_summary"]} selected={scopes} onToggle={(value) => setScopes(scopes.includes(value) ? scopes.filter((item) => item !== value) : [...scopes, value])} />
      <BodyText muted>Scopes are limited, expiring, revocable, and auditable.</BodyText>
      <ActionButton label={mutation.isPending ? "Sending..." : "Send caregiver invite"} onPress={() => mutation.mutate()} />
      <ErrorText error={mutation.error} />
    </Panel>
  );
}

export function ProfessionalsScreen() {
  const [email, setEmail] = useState("professional@moveinrange.local");
  const [scopes, setScopes] = useState(["readiness_summary", "movement_restrictions"]);
  const mutation = useMutation({ mutationFn: () => inviteProfessional(email, "physical_therapist", scopes) });
  return (
    <Panel title="Professional access">
      <TextField label="Professional email" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <ChipGroup labels={["readiness_summary", "movement_restrictions", "plan_review", "progression_review"]} selected={scopes} onToggle={(value) => setScopes(scopes.includes(value) ? scopes.filter((item) => item !== value) : [...scopes, value])} />
      <BodyText muted>This is scoped collaboration, not clinical care certification.</BodyText>
      <ActionButton label={mutation.isPending ? "Sending..." : "Send professional invite"} onPress={() => mutation.mutate()} />
      <ErrorText error={mutation.error} />
    </Panel>
  );
}
