export type WorkflowKind =
  | "onboarding"
  | "onboarding-edit"
  | "readiness"
  | "quick-session"
  | "daily-plan"
  | "weekly-plan"
  | "monthly-plan"
  | "calendar"
  | "exercises"
  | "exercise-detail"
  | "workout"
  | "workout-pain"
  | "workout-symptom"
  | "workout-feedback"
  | "diabetes"
  | "integrations"
  | "notifications"
  | "privacy"
  | "caregivers"
  | "professionals"
  | "achievements"
  | "settings";

export type RouteMeta = {
  title: string;
  subtitle: string;
};
