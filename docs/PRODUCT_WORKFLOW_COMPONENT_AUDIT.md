# Product Workflow Component Audit

Audit date: 2026-07-19

## Previous state

- Feature: mobile product workflow
- Route coverage: 22 route kinds were handled by one `ProductWorkflowScreen.tsx`.
- Previous line count: 477.
- Conditional branching: one large `renderBody()` function selected route behavior with broad `if` groups.
- Shared state risk: email, onboarding step, minutes, and last session state lived in the same component even when unrelated routes did not need them.
- Generic UI risk: many route bodies reused the same panel phrasing and default mutations rather than feature-specific forms.
- Validation gaps: onboarding used a generic accepted payload; route-specific validation lived mostly in tests or backend models.
- Data loading: all queries were declared in the mega-component and enabled conditionally, increasing responsibility and making route behavior harder to inspect.
- Accessibility: labels existed, but several labels were generic because controls were created by the shared workflow body.
- Loading and error handling: repeated inline `ActivityIndicator` and `ErrorText` usage made consistency dependent on the branch.

## Final state

- Feature: mobile product workflow
- Route coverage: 22 route kinds still route through `ProductWorkflowScreen.tsx`.
- Final line count: 83.
- Extracted features:
  - `apps/mobile/src/features/auth/AuthScreen.tsx`
  - `apps/mobile/src/features/onboarding/OnboardingScreen.tsx`
  - `apps/mobile/src/features/onboarding/model.ts`
  - `apps/mobile/src/features/readiness/ReadinessScreen.tsx`
  - `apps/mobile/src/features/plans/PlanScreens.tsx`
  - `apps/mobile/src/features/workout/WorkoutScreens.tsx`
  - `apps/mobile/src/features/exercises/ExerciseScreens.tsx`
  - `apps/mobile/src/features/diabetes/DiabetesScreen.tsx`
  - `apps/mobile/src/features/integrations/IntegrationsScreen.tsx`
  - `apps/mobile/src/features/notifications/NotificationsScreen.tsx`
  - `apps/mobile/src/features/privacy/PrivacyScreen.tsx`
  - `apps/mobile/src/features/sharing/SharingScreens.tsx`
  - `apps/mobile/src/features/calendar/CalendarScreen.tsx`
  - `apps/mobile/src/features/achievements/AchievementsScreen.tsx`
  - `apps/mobile/src/features/settings/SettingsScreen.tsx`
  - `apps/mobile/src/features/shared/ui.tsx`

## Acceptance result

The generic workflow component is now a small dispatcher. Route-specific query, mutation, form, validation, loading, empty, and error behavior lives in feature modules. Onboarding metadata and validation are testable without rendering JSX.
