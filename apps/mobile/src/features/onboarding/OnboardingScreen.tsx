import { useMemo, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch, saveOnboardingStep } from "../../api";
import { ActionButton, BodyText, ChipGroup, ChoiceChip, ErrorText, LoadingState, Panel, TextField } from "../shared/ui";
import { BODY_REGIONS, CAPACITY_LEVELS, CONDITIONS, EQUIPMENT, EXPERIENCE_LEVELS, GENDER_OPTIONS, GOALS, initialOnboardingDraft, MOBILITY_AIDS, MOVEMENT_PATTERNS, MUSCLES, ONBOARDING_STEPS, PHYSIOLOGICAL_CONTEXTS, POSITIONS, type OnboardingDraft, validateOnboardingStepPayload } from "./model";

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

const errorCopy: Record<string, string> = {
  preferred_name_required: "Enter at least 2 characters for your preferred name.",
  date_of_birth_iso_required: "Enter a complete birth date with year, month, and day.",
  self_description_required: "Add your self-description or choose another option.",
  trimester_required_when_pregnancy_selected: "Choose a trimester when pregnancy is selected.",
  height_weight_required: "Enter height and weight as numbers.",
  locale_required: "Choose country, timezone, and language.",
  side_required: "Choose a side for the selected sensitive region.",
  goal_required: "Choose at least one goal.",
  target_required: "Choose at least one target muscle.",
  minimum_five_minutes: "Choose at least 5 minutes.",
  restriction_review_date_required: "Add a review date for active clinician restrictions.",
  injury_status_required: "Choose the current status for this injury or surgery entry.",
  mobility_aid_use_required: "Choose when this mobility aid is used.",
  sedentary_hours_invalid: "Sedentary hours must be 24 or less.",
  confidence_required: "Choose confidence from 1 to 5."
};

function StepFields({ stepKey, draft, setDraft }: { stepKey: string; draft: OnboardingDraft; setDraft: (draft: OnboardingDraft) => void }) {
  const patch = (partial: Partial<OnboardingDraft>) => setDraft({ ...draft, ...partial });
  const [birthYear = "", birthMonth = "", birthDay = ""] = draft.dateOfBirth.split("-");
  const patchBirthDate = (part: "year" | "month" | "day", value: string) => {
    const nextYear = part === "year" ? value : birthYear;
    const nextMonth = part === "month" ? value : birthMonth;
    const nextDay = part === "day" ? value : birthDay;
    patch({ dateOfBirth: [nextYear, nextMonth, nextDay].join("-") });
  };
  if (stepKey === "preferred_name") return <TextField label="Preferred name / Tercih edilen ad" value={draft.preferredName} onChangeText={(preferredName) => patch({ preferredName })} />;
  if (stepKey === "date_of_birth") {
    return (
      <>
        <TextField label="Birth year YYYY" keyboardType="number-pad" value={birthYear} onChangeText={(value) => patchBirthDate("year", value)} />
        <TextField label="Birth month MM" keyboardType="number-pad" value={birthMonth} onChangeText={(value) => patchBirthDate("month", value)} />
        <TextField label="Birth day DD" keyboardType="number-pad" value={birthDay} onChangeText={(value) => patchBirthDate("day", value)} />
      </>
    );
  }
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
  if (stepKey === "clinician_restrictions") {
    return (
      <>
        <ChoiceChip label="Clinician restriction applies" selected={draft.clinicianRestriction} onPress={() => patch({ clinicianRestriction: !draft.clinicianRestriction })} />
        <ChipGroup labels={BODY_REGIONS} selected={draft.prohibitedRegions} onToggle={(value) => patch({ prohibitedRegions: toggle(draft.prohibitedRegions, value) })} />
        <ChipGroup labels={MOVEMENT_PATTERNS} selected={draft.prohibitedMovements} onToggle={(value) => patch({ prohibitedMovements: toggle(draft.prohibitedMovements, value) })} />
        <ChipGroup labels={POSITIONS} selected={draft.prohibitedPositions} onToggle={(value) => patch({ prohibitedPositions: toggle(draft.prohibitedPositions, value) })} />
        <TextField label="Maximum duration minutes" keyboardType="number-pad" value={draft.maxDuration} onChangeText={(maxDuration) => patch({ maxDuration })} />
        <TextField label="Maximum intensity" value={draft.maxIntensity} onChangeText={(maxIntensity) => patch({ maxIntensity })} />
        <ChoiceChip label="No floor work" selected={draft.noFloor} onPress={() => patch({ noFloor: !draft.noFloor })} />
        <ChoiceChip label="No impact" selected={draft.noImpact} onPress={() => patch({ noImpact: !draft.noImpact })} />
        <ChoiceChip label="No overhead" selected={draft.noOverhead} onPress={() => patch({ noOverhead: !draft.noOverhead })} />
        <TextField label="Restriction start date YYYY-MM-DD" value={draft.restrictionStartDate} onChangeText={(restrictionStartDate) => patch({ restrictionStartDate })} />
        <TextField label="Review date YYYY-MM-DD" value={draft.restrictionReviewDate} onChangeText={(restrictionReviewDate) => patch({ restrictionReviewDate })} />
        <TextField label="Clinician note and attachment metadata" value={draft.notes} onChangeText={(notes) => patch({ notes })} multiline />
      </>
    );
  }
  if (stepKey === "injuries_surgery") {
    return (
      <>
        <ChipGroup labels={BODY_REGIONS} selected={draft.injuryRegion ? [draft.injuryRegion] : []} onToggle={(injuryRegion) => patch({ injuryRegion })} />
        <ChipGroup labels={["left", "right", "bilateral"]} selected={[draft.injurySide]} onToggle={(injurySide) => patch({ injurySide })} />
        <ChipGroup labels={["injury", "surgery"]} selected={[draft.injuryKind]} onToggle={(injuryKind) => patch({ injuryKind })} />
        <TextField label="Type" value={draft.injuryType} onChangeText={(injuryType) => patch({ injuryType })} />
        <TextField label="Date YYYY-MM-DD" value={draft.injuryDate} onChangeText={(injuryDate) => patch({ injuryDate })} />
        <TextField label="Current status" value={draft.injuryStatus} onChangeText={(injuryStatus) => patch({ injuryStatus })} />
        <TextField label="Pain severity 0-10" keyboardType="number-pad" value={draft.injuryPainSeverity} onChangeText={(injuryPainSeverity) => patch({ injuryPainSeverity })} />
        <TextField label="Range-of-motion limitation" value={draft.injuryRomLimitation} onChangeText={(injuryRomLimitation) => patch({ injuryRomLimitation })} />
        <ChoiceChip label="Clinician cleared" selected={draft.injuryClinicianCleared} onPress={() => patch({ injuryClinicianCleared: !draft.injuryClinicianCleared })} />
        <TextField label="Notes" value={draft.notes} onChangeText={(notes) => patch({ notes })} multiline />
      </>
    );
  }
  if (stepKey === "mobility_aids") {
    return (
      <>
        <ChipGroup labels={MOBILITY_AIDS} selected={draft.mobilityAids} onToggle={(value) => patch({ mobilityAids: toggle(draft.mobilityAids, value) })} />
        <ChipGroup labels={["always", "sometimes", "exercise only"]} selected={[draft.mobilityAidUse]} onToggle={(mobilityAidUse) => patch({ mobilityAidUse })} />
        <ChipGroup labels={["left", "right", "bilateral", "not applicable"]} selected={[draft.mobilityAidSide]} onToggle={(mobilityAidSide) => patch({ mobilityAidSide })} />
        <TextField label="Mobility aid notes" value={draft.notes} onChangeText={(notes) => patch({ notes })} multiline />
      </>
    );
  }
  if (stepKey === "activity_experience") {
    return (
      <>
        <TextField label="Daily step range" value={draft.dailyStepRange} onChangeText={(dailyStepRange) => patch({ dailyStepRange })} />
        <TextField label="Weekly exercise frequency" keyboardType="number-pad" value={draft.weeklyExerciseFrequency} onChangeText={(weeklyExerciseFrequency) => patch({ weeklyExerciseFrequency })} />
        <TextField label="Last regular exercise date YYYY-MM-DD" value={draft.lastRegularExerciseDate} onChangeText={(lastRegularExerciseDate) => patch({ lastRegularExerciseDate })} />
        <ChipGroup labels={EXPERIENCE_LEVELS} selected={[draft.strengthExperience]} onToggle={(strengthExperience) => patch({ strengthExperience })} />
        <ChipGroup labels={EXPERIENCE_LEVELS} selected={[draft.cardioExperience]} onToggle={(cardioExperience) => patch({ cardioExperience })} />
        <ChipGroup labels={EXPERIENCE_LEVELS} selected={[draft.mobilityExperience]} onToggle={(mobilityExperience) => patch({ mobilityExperience })} />
        <ChipGroup labels={EXPERIENCE_LEVELS} selected={[draft.balanceExperience]} onToggle={(balanceExperience) => patch({ balanceExperience })} />
        <TextField label="Sedentary hours per day" keyboardType="number-pad" value={draft.sedentaryHours} onChangeText={(sedentaryHours) => patch({ sedentaryHours })} />
        <TextField label="Preferred intensity" value={draft.preferredIntensity} onChangeText={(preferredIntensity) => patch({ preferredIntensity })} />
      </>
    );
  }
  if (stepKey === "functional_capacity") {
    return (
      <>
        <ChipGroup labels={CAPACITY_LEVELS} selected={[draft.chairRise]} onToggle={(chairRise) => patch({ chairRise })} />
        <ChipGroup labels={CAPACITY_LEVELS} selected={[draft.floorRise]} onToggle={(floorRise) => patch({ floorRise })} />
        <ChipGroup labels={CAPACITY_LEVELS} selected={[draft.stairs]} onToggle={(stairs) => patch({ stairs })} />
        <ChipGroup labels={CAPACITY_LEVELS} selected={[draft.singleLegStanding]} onToggle={(singleLegStanding) => patch({ singleLegStanding })} />
        <TextField label="Walking tolerance minutes" keyboardType="number-pad" value={draft.walkingTolerance} onChangeText={(walkingTolerance) => patch({ walkingTolerance })} />
        <TextField label="Prolonged standing minutes" keyboardType="number-pad" value={draft.prolongedStanding} onChangeText={(prolongedStanding) => patch({ prolongedStanding })} />
        <ChipGroup labels={CAPACITY_LEVELS} selected={[draft.overheadReach]} onToggle={(overheadReach) => patch({ overheadReach })} />
        <ChipGroup labels={CAPACITY_LEVELS} selected={[draft.gripPerception]} onToggle={(gripPerception) => patch({ gripPerception })} />
        <TextField label="Confidence 1-5" keyboardType="number-pad" value={draft.confidence} onChangeText={(confidence) => patch({ confidence })} />
        <ChipGroup labels={["dizziness", "shortness of breath", "pain change", "fatigue"]} selected={draft.capacitySymptoms} onToggle={(value) => patch({ capacitySymptoms: toggle(draft.capacitySymptoms, value) })} />
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
    onSuccess: () => {
      if (stepIndex === ONBOARDING_STEPS.length - 1) {
        router.replace("/(tabs)");
      } else {
        setStepIndex((value) => Math.min(value + 1, ONBOARDING_STEPS.length - 1));
      }
    }
  });

  return (
    <>
      <Panel title={`Step ${stepIndex + 1} of ${ONBOARDING_STEPS.length}`}>
        <BodyText>{current.en} / {current.tr}</BodyText>
        <BodyText muted>Saved draft: {onboarding.isLoading ? "checking..." : onboarding.data?.item?.current_step ?? "none"}</BodyText>
        <StepFields stepKey={current.key} draft={draft} setDraft={setDraft} />
        {errors.map((error) => <BodyText key={error} muted>{errorCopy[error] ?? error}</BodyText>)}
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
