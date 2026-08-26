export type OnboardingStep =
  | "identity"
  | "physiological_context"
  | "health_profile"
  | "goals"
  | "capacity"
  | "baseline_assessment"
  | "consent";

export type OnboardingDraft = {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  payload: Record<string, Record<string, unknown>>;
  language: "en" | "tr";
};

export const onboardingSteps: OnboardingStep[] = [
  "identity",
  "physiological_context",
  "health_profile",
  "goals",
  "capacity",
  "baseline_assessment",
  "consent"
];

export function emptyOnboardingDraft(language: "en" | "tr" = "en"): OnboardingDraft {
  return { currentStep: "identity", completedSteps: [], payload: {}, language };
}

export function validateOnboardingStep(step: OnboardingStep, payload: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (step === "identity") {
    if (!payload.preferred_name) errors.push("preferred_name_required");
    if (!payload.date_of_birth) errors.push("date_of_birth_required");
    if (!payload.timezone) errors.push("timezone_required");
    if (!payload.language) errors.push("language_required");
  }
  if (step === "consent") {
    for (const key of ["wellness_limitations", "health_data_processing"]) {
      if (payload[key] !== true) errors.push(`${key}_required`);
    }
  }
  if (step === "capacity" && payload.single_leg_stand === "unable" && payload.balance_support_requirement !== true) {
    errors.push("balance_support_confirmation_required");
  }
  return errors;
}

export function saveStep(draft: OnboardingDraft, step: OnboardingStep, payload: Record<string, unknown>): OnboardingDraft {
  const completed = validateOnboardingStep(step, payload).length === 0;
  const completedSteps = completed ? Array.from(new Set([...draft.completedSteps, step])) as OnboardingStep[] : draft.completedSteps.filter((item) => item !== step);
  const nextIndex = Math.min(onboardingSteps.length - 1, onboardingSteps.indexOf(step) + (completed ? 1 : 0));
  return {
    ...draft,
    currentStep: onboardingSteps[nextIndex],
    completedSteps,
    payload: { ...draft.payload, [step]: payload },
    language: payload.language === "tr" ? "tr" : draft.language
  };
}

export function isOnboardingComplete(draft: OnboardingDraft): boolean {
  return ["identity", "health_profile", "goals", "capacity", "consent"].every((step) => draft.completedSteps.includes(step as OnboardingStep));
}
