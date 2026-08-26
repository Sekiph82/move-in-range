import { AchievementsScreen } from "../features/achievements/AchievementsScreen";
import { CalendarScreen } from "../features/calendar/CalendarScreen";
import { DiabetesScreen } from "../features/diabetes/DiabetesScreen";
import { ExerciseDetailScreen, ExerciseLibraryScreen } from "../features/exercises/ExerciseScreens";
import { IntegrationsScreen } from "../features/integrations/IntegrationsScreen";
import { NotificationsScreen } from "../features/notifications/NotificationsScreen";
import { OnboardingScreen } from "../features/onboarding/OnboardingScreen";
import { GeneralInformationScreen, MovementProfileScreen } from "../features/profile/ProfileEditorScreens";
import { PlanGenerationWizardScreen } from "../features/plans/PlanGenerationWizardScreen";
import { DailyPlanScreen, MonthlyPlanScreen, QuickSessionScreen, WeeklyPlanScreen } from "../features/plans/PlanScreens";
import { PrivacyScreen } from "../features/privacy/PrivacyScreen";
import { ReadinessScreen } from "../features/readiness/ReadinessScreen";
import { CaregiversScreen, ProfessionalsScreen } from "../features/sharing/SharingScreens";
import { RouteScaffold } from "../features/shared/ui";
import { SettingsScreen } from "../features/settings/SettingsScreen";
import { WorkoutEventScreen, WorkoutScreen } from "../features/workout/WorkoutScreens";
import { WorkoutPreviewScreen } from "../features/workout/WorkoutPreviewScreen";
import type { RouteMeta, WorkflowKind } from "../features/shared/types";

type Props = {
  kind: WorkflowKind;
  id?: string;
};

const routeMeta: Record<WorkflowKind, RouteMeta> = {
  onboarding: { title: "Onboarding", subtitle: "A short card setup captures only the essentials before planning." },
  "onboarding-edit": { title: "Movement profile", subtitle: "Update goals, limitations, equipment, and training preferences." },
  "general-info": { title: "General information", subtitle: "Review saved basics first, then edit only approved fields." },
  "generate-plan": { title: "Plan generation", subtitle: "Choose today's condition, focus, duration, and style before building a saved plan." },
  "workout-preview": { title: "Workout preview", subtitle: "Review the saved plan before readiness and guided movement." },
  readiness: { title: "Readiness", subtitle: "A daily safety check gates movement intensity." },
  "quick-session": { title: "Quick session", subtitle: "Create a short plan from available time and constraints." },
  "daily-plan": { title: "Daily plan", subtitle: "Generate, inspect, modify, and start today's plan." },
  "weekly-plan": { title: "Weekly plan", subtitle: "Review a seven-day rhythm with rest and lower-intensity days." },
  "monthly-plan": { title: "Monthly plan", subtitle: "See progression phases and stopping rules." },
  calendar: { title: "Calendar", subtitle: "Movement events, sessions, and reminders in one timeline." },
  exercises: { title: "Exercises", subtitle: "Search, filter, and open safety-aware exercise detail." },
  "exercise-detail": { title: "Exercise detail", subtitle: "Instructions, tags, media fallback, and substitutions." },
  workout: { title: "Workout player", subtitle: "Guided movement, local voice cues, pause, and finish." },
  "workout-pain": { title: "Pain report", subtitle: "Pause the session and record a safer next action." },
  "workout-symptom": { title: "Symptom report", subtitle: "Stop movement and require a new readiness check." },
  "workout-feedback": { title: "Feedback", subtitle: "Capture exertion and exercise-specific feedback." },
  diabetes: { title: "Diabetes", subtitle: "Log context and delayed checks without treatment advice." },
  integrations: { title: "Integrations", subtitle: "Sandbox providers connect; credentialed providers show blockers." },
  notifications: { title: "Notifications", subtitle: "Private local reminders with quiet-hour preferences." },
  privacy: { title: "Privacy", subtitle: "Export and deletion requests are explicit and auditable." },
  caregivers: { title: "Caregivers", subtitle: "Share limited progress context with a trusted helper." },
  professionals: { title: "Professionals", subtitle: "Invite a professional and keep restrictions scoped." },
  achievements: { title: "Achievements", subtitle: "Celebrate consistency without unsafe pressure." },
  settings: { title: "Settings", subtitle: "Maintain goals, capacity, consents, and accessibility preferences." }
};

function WorkflowBody({ kind, id }: Props) {
  switch (kind) {
    case "onboarding": return <OnboardingScreen />;
    case "onboarding-edit": return <MovementProfileScreen />;
    case "general-info": return <GeneralInformationScreen />;
    case "generate-plan": return <PlanGenerationWizardScreen />;
    case "workout-preview": return <WorkoutPreviewScreen />;
    case "readiness": return <ReadinessScreen />;
    case "quick-session": return <QuickSessionScreen />;
    case "daily-plan": return <DailyPlanScreen />;
    case "weekly-plan": return <WeeklyPlanScreen />;
    case "monthly-plan": return <MonthlyPlanScreen />;
    case "calendar": return <CalendarScreen />;
    case "exercises": return <ExerciseLibraryScreen />;
    case "exercise-detail": return <ExerciseDetailScreen id={id} />;
    case "workout": return <WorkoutScreen id={id} />;
    case "workout-pain":
    case "workout-symptom":
    case "workout-feedback":
      return <WorkoutEventScreen kind={kind} id={id} />;
    case "diabetes": return <DiabetesScreen />;
    case "integrations": return <IntegrationsScreen />;
    case "notifications": return <NotificationsScreen />;
    case "privacy": return <PrivacyScreen />;
    case "caregivers": return <CaregiversScreen />;
    case "professionals": return <ProfessionalsScreen />;
    case "achievements": return <AchievementsScreen />;
    case "settings": return <SettingsScreen />;
  }
}

export function ProductWorkflowScreen({ kind, id }: Props) {
  if (kind === "workout") return <WorkflowBody kind={kind} id={id} />;
  const route = routeMeta[kind];
  return (
    <RouteScaffold title={route.title} subtitle={route.subtitle}>
      <WorkflowBody kind={kind} id={id} />
    </RouteScaffold>
  );
}
