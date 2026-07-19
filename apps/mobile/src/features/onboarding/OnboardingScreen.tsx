import { useMemo, useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch, saveOnboardingStep } from "../../api";
import { ActionButton, BodyText, ChipGroup, ChoiceChip, ErrorText, LoadingState, Panel, TextField } from "../shared/ui";
import { BODY_REGIONS, CONDITIONS, EQUIPMENT, GENDER_OPTIONS, GOALS, initialOnboardingDraft, MUSCLES, ONBOARDING_STEPS, PHYSIOLOGICAL_CONTEXTS, type OnboardingDraft, validateOnboardingStepPayload } from "./model";

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function StepFields({ stepKey, draft, setDraft }: { stepKey: string; draft: OnboardingDraft; setDraft: (draft: OnboardingDraft) => void }) {
  const patch = (partial: Partial<OnboardingDraft>) => setDraft({ ...draft, ...partial });
  if (stepKey === "preferred_name") return <TextField label="Preferred name / Tercih edilen ad" value={draft.preferredName} onChangeText={(preferredName) => patch({ preferredName })} />;
  if (stepKey === "date_of_birth") return <TextField label="Date of birth YYYY-MM-DD" value={draft.dateOfBirth} onChangeText={(dateOfBirth) => patch({ dateOfBirth })} />;
  if (stepKey === "gender") {
    return (
      <>
        <ChipGroup labels={GENDER_OPTIONS} selected={[draft.gender]} onToggle={(gender) => patch({ gender })} />
        {draft.gender === "Self-described" ? <TextField label="Self-described gender" value={draft.selfDescribe} onChangeText={(selfDescribe) => patch({ selfDescribe })} /> : null}
        <BodyText muted>Pregnancy, menopause, and pelvic-floor context are never inferred from gender.</BodyText>
      </>
    );
  }
  if (stepKey === "physiological_contexts") {
    return (
      <>
        <ChipGroup labels={PHYSIOLOGICAL_CONTEXTS} selected={draft.contexts} onToggle={(value) => patch({ contexts: toggle(draft.contexts, value) })} />
        {draft.contexts.includes("pregnancy") ? <ChipGroup labels={["first trimester", "second trimester", "third trimester"]} selected={draft.trimester ? [draft.trimester] : []} onToggle={(trimester) => patch({ trimester })} /> : null}
      </>
    );
  }
  if (stepKey === "height_weight") {
    return (
      <>
        <TextField label="Height in cm" keyboardType="number-pad" value={draft.heightCm} onChangeText={(heightCm) => patch({ heightCm })} />
        <TextField label="Weight in kg" keyboardType="number-pad" value={draft.weightKg} onChangeText={(weightKg) => patch({ weightKg })} />
      </>
    );
  }
  if (stepKey === "locale") {
    return (
      <>
        <TextField label="Country" value={draft.country} onChangeText={(country) => patch({ country })} />
        <TextField label="Timezone" value={draft.timezone} onChangeText={(timezone) => patch({ timezone })} />
        <ChipGroup labels={["en", "tr"]} selected={[draft.language]} onToggle={(language) => patch({ language: language as OnboardingDraft["language"] })} />
      </>
    );
  }
  if (stepKey === "health_conditions") {
    return (
      <>
        <ChipGroup labels={CONDITIONS} selected={draft.conditions} onToggle={(value) => patch({ conditions: toggle(draft.conditions, value) })} />
        <TextField label="Condition notes, severity, diagnosis source, review date" value={draft.notes} onChangeText={(notes) => patch({ notes })} multiline />
      </>
    );
  }
  if (stepKey === "sensitivity_regions") {
    return (
      <>
        <ChipGroup labels={BODY_REGIONS} selected={draft.sensitivityRegions} onToggle={(value) => patch({ sensitivityRegions: toggle(draft.sensitivityRegions, value) })} />
        <ChipGroup labels={["left", "right", "bilateral"]} selected={[draft.side]} onToggle={(side) => patch({ side })} />
        <TextField label="Severity 0-10" keyboardType="number-pad" value={draft.severity} onChangeText={(severity) => patch({ severity })} />
        <ChoiceChip label="Clinician restriction applies" selected={draft.clinicianRestriction} onPress={() => patch({ clinicianRestriction: !draft.clinicianRestriction })} />
      </>
    );
  }
  if (stepKey === "goals") return <ChipGroup labels={GOALS} selected={draft.goals} onToggle={(value) => patch({ goals: toggle(draft.goals, value) })} />;
  if (stepKey === "target_muscles") return <ChipGroup labels={MUSCLES} selected={draft.targets} onToggle={(value) => patch({ targets: toggle(draft.targets, value) })} />;
  if (stepKey === "environment_equipment") return <ChipGroup labels={EQUIPMENT} selected={draft.equipment} onToggle={(value) => patch({ equipment: toggle(draft.equipment, value) })} />;
  if (stepKey === "schedule_time") return <TextField label="Preferred movement minutes" keyboardType="number-pad" value={draft.minutes} onChangeText={(minutes) => patch({ minutes })} />;
  if (stepKey === "diabetes_notifications") {
    return (
      <>
        <ChoiceChip label="Enable diabetes context prompts" selected={draft.diabetesEnabled} onPress={() => patch({ diabetesEnabled: !draft.diabetesEnabled })} />
        <ChoiceChip label="Use quiet hours for notifications" selected={draft.quietHours} onPress={() => patch({ quietHours: !draft.quietHours })} />
      </>
    );
  }
  if (stepKey === "review_complete") {
    return (
      <>
        <BodyText>Name: {draft.preferredName}</BodyText>
        <BodyText>Goals: {draft.goals.join(", ")}</BodyText>
        <BodyText>Targets: {draft.targets.join(", ")}</BodyText>
        <BodyText muted>Completing saves the resumable onboarding draft and marks onboarding complete.</BodyText>
      </>
    );
  }
  return <TextField label={`${stepKey.replaceAll("_", " ")} notes`} value={draft.notes} onChangeText={(notes) => patch({ notes })} multiline />;
}

export function OnboardingScreen() {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(initialOnboardingDraft);
  const current = ONBOARDING_STEPS[stepIndex];
  const onboarding = useQuery({ queryKey: ["onboarding"], queryFn: () => apiFetch<any>("/onboarding") });
  const errors = useMemo(() => validateOnboardingStepPayload(current.key, draft), [current.key, draft]);
  const saveStepMutation = useMutation({
    mutationFn: () => saveOnboardingStep(current.key, { ...draft, step_number: stepIndex + 1, labels: { en: current.en, tr: current.tr } }, stepIndex === ONBOARDING_STEPS.length - 1, draft.language),
    onSuccess: () => setStepIndex((value) => Math.min(value + 1, ONBOARDING_STEPS.length - 1))
  });

  return (
    <>
      <Panel title={`Step ${stepIndex + 1} of ${ONBOARDING_STEPS.length}`}>
        <BodyText>{current.en} / {current.tr}</BodyText>
        <BodyText muted>Saved draft: {onboarding.isLoading ? "checking..." : onboarding.data?.item?.current_step ?? "none"}</BodyText>
        <StepFields stepKey={current.key} draft={draft} setDraft={setDraft} />
        {errors.map((error) => <BodyText key={error} muted>{error}</BodyText>)}
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <ActionButton label="Back" disabled={stepIndex === 0} onPress={() => setStepIndex((value) => Math.max(value - 1, 0))} />
          <ActionButton label={saveStepMutation.isPending ? "Saving..." : stepIndex === ONBOARDING_STEPS.length - 1 ? "Finish onboarding" : "Save and continue"} disabled={errors.length > 0} onPress={() => saveStepMutation.mutate()} />
          <ActionButton label="Resume latest" onPress={() => setStepIndex(Math.min(Number(onboarding.data?.item?.draft_payload?.step_number ?? 1) - 1, ONBOARDING_STEPS.length - 1))} />
        </View>
        <ErrorText error={saveStepMutation.error} />
      </Panel>
      <Panel title="Progress">
        {ONBOARDING_STEPS.map((step, index) => <BodyText key={step.key}>{index < stepIndex ? "Saved" : index === stepIndex ? "Current" : "Pending"}: {step.en}</BodyText>)}
      </Panel>
      {onboarding.isLoading ? <LoadingState label="Loading onboarding draft" /> : null}
    </>
  );
}
