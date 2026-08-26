# openGym Integration Audit

Status: planning only. No source code, migrations, or product behavior were integrated as part of this audit.

Reference repository: `https://github.com/arvids-unavailable/openGym`
Local reference clone used for review: `C:\Users\sekip\Desktop\MoveInRange-Workspace\reference\openGym`
Target MoveInRange branch: `codex/release-rehearsal`

## 1. openGym Architecture

openGym is a self-hosted workout tracker with a React/Vite frontend, a small Node API, optional Capacitor mobile packaging, nginx for local web serving, JSON-file persistence, and local-first client state. The frontend owns most of the workout domain behavior: routine editing, workout execution, set construction, progression calculation, exercise library search, body-map workload visualization, import/export, and stats. The API mostly supports authentication, passkeys, sync, activity presence, admin views, invites, and push notifications.

Key architectural traits:

- Frontend state is persisted locally and mirrored to the server for signed-in users.
- The active workout remains client-local during execution and is excluded from ordinary server sync.
- Routines, weekly assignments, date overrides, custom exercises, exercise weights, workout history, bodyweight entries, and user preferences live in a compact client state shape.
- Workout behavior is implemented as pure-ish helper functions plus React screens rather than a normalized backend workflow.
- Supersets are represented by adjacent exercise configurations sharing a superset group identifier.
- Progression is calculated from historical completed workouts and writes the next prescription into the next active plan only when the user starts or edits a routine.

MoveInRange should not adopt this architecture directly. MoveInRange already has a FastAPI backend, PostgreSQL/Supabase persistence, safety/readiness gates, typed shared plan models, an Expo React Native mobile app, plan/session/event APIs, and medical-safety flows. The useful openGym ideas should be ported as domain concepts and UX patterns, not as frontend state architecture or source code.

## 2. License Findings

openGym is licensed under AGPL-3.0-or-later. Its root license, frontend package, API package, and notice file all point to AGPL coverage for the application source. The project also contains a special app-store distribution permission, but that permission does not remove the AGPL obligations for covered code.

Implications for MoveInRange:

- Do not copy openGym source code into MoveInRange without a deliberate AGPL legal review.
- Do not copy React components, helper functions, CSS, API code, tests, fixture data, or body-map path data as implementation shortcuts.
- Use openGym only as a behavioral reference for product planning unless counsel approves a compatible licensing strategy.
- The body diagram geometry references a separate MIT-derived source. If MoveInRange ever uses that geometry, preserve MIT attribution and verify the derivation chain.
- Exercise media and exercise data are not safely reusable just because they appear in openGym. They originate from an external exercise dataset and must be independently license-verified before import.

Recommended position: keep this audit and the follow-up specs at the level of concepts, data models, and acceptance criteria. Build new MoveInRange implementations from scratch inside the existing architecture.

## 3. Valuable Features

The strongest openGym capabilities worth adapting conceptually are:

- Guided workout execution with per-set state, work timers, rest timers, skipped/added sets, and previous-performance context.
- Distinct exercise execution modes: loaded reps, bodyweight reps, timed holds/intervals, and cardio duration/speed.
- Simple but explainable progression policies that return a next target plus a human-readable reason.
- Bodyweight-aware progression that increases reps/sets first and only later suggests external load or a harder variation.
- Timed-exercise progression based on held seconds rather than reps.
- Date-specific day overrides that allow rest/recovery/reschedule decisions without mutating the recurring weekly template.
- Superset grouping at the plan-exercise level.
- Exercise history views that separate top set, estimated strength, volume, effort, and recent-session trend.
- Muscle workload visualization using effective sets rather than raw weight volume.
- Activity heatmap based on completed training minutes.
- CSV import concepts for external workout history, with unmatched exercise handling and unit conversion.

## 4. Features Not to Port

These openGym choices should not be ported into MoveInRange:

- JSON-file persistence.
- LocalStorage as the authoritative product database.
- Whole-state sync blobs for signed-in users.
- WebAuthn/passkey authentication model from the Node API.
- Admin activity presence as a first workout-engine milestone.
- Dataset/media files or exercise names/instructions copied from openGym.
- Body-map geometry copied from openGym without separate license review.
- Nginx single-origin container layout as the app architecture.
- Any AGPL-covered source implementation.
- openGym's guest/demo mode as a substitute for MoveInRange's authenticated beta model.

## 5. MoveInRange Gap Analysis

MoveInRange already has strong foundations:

- Typed daily, weekly, and monthly plan payloads.
- Deterministic plan item identifiers.
- FastAPI session lifecycle endpoints.
- Readiness, pain, symptom, and safety-stop flows.
- Exercise import pipeline with media manifest and license status fields.
- Mobile workout player phases for prepare, work, rest, side switch, pause, substitution, pain checks, completion, and stop states.
- Progress summary and calendar event persistence.

Current gaps compared with the useful openGym behaviors:

- Plan items do not yet carry a canonical execution-mode contract for reps, timed, cardio, bodyweight, assisted, or loaded variants.
- Sessions track current index and payload snapshots, but not normalized per-exercise and per-set actuals.
- Feedback is session/exercise level, not set-level.
- Progression is conservative and global, not exercise-specific.
- Weekly/monthly planning can generate schedules but does not yet expose a rich mutation model for move, replace, rest, recovery, skip, and reschedule actions.
- Progress UI lacks activity heatmaps, muscle workload balance, and per-exercise trend pages.
- Muscle targeting exists in exercise metadata, but there is no workload computation layer.
- Superset/circuit semantics are not explicit in the canonical shared plan type.

## 6. Exercise Data Comparison

openGym exercise records include an id, localized-ish name field, body part, equipment, target muscle, secondary muscles, image/gif references, and instruction text. The reviewed reference dataset had 1324 exercises, broad gym-equipment coverage, and categories for bodyweight, cardio machines, free weights, machines, bands, sleds, rollers, and specialty equipment.

MoveInRange exercise records are already richer for safety and beta operations. The shared and API-side model supports body part, equipment, localization, media manifests, deterministic hashes, tags, attribution, import provenance, and derived accessibility/safety flags. The mobile type adds difficulty, impact, unilateral flags, side-switch handling, preparation duration, work/rest duration, instructions, breathing cues, mistakes, safety notes, approved substitutions, and media.

Recommended canonical exercise model additions:

- Separate anatomical targets from safety tags.
- Store primary and secondary muscles with weights.
- Store execution capabilities per exercise, such as reps, timed, cardio, unilateral, assisted, loaded, bodyweight, and distance.
- Store equipment requirements separately from optional load units.
- Preserve existing license and media provenance fields.
- Add a review state for any imported exercise whose media, instructions, or anatomical mapping are uncertain.

## 7. Canonical Workout Model

MoveInRange should introduce a normalized workout model while preserving the existing JSON plan payloads for API compatibility.

Core entities:

- `PlanVersion`: immutable generated plan snapshot with safety context, generator version, source plan, and date range.
- `PlannedDay`: one date in a weekly or monthly plan, with assigned status and optional override source.
- `PlannedExercise`: canonical executable item with stable plan item id, exercise id, block, order, superset/circuit group, execution mode, target prescription, rest policy, preparation policy, side-switch policy, and substitution list.
- `WorkoutSession`: the started instance of a plan day or quick session.
- `SessionExercise`: execution state for one planned exercise within a session.
- `ExerciseSet`: target and actual values for each set or interval.
- `SessionEvent`: immutable event stream for start, pause, resume, set complete, rest start, skip, substitution, pain, symptom, and completion.
- `WorkoutFeedback`: structured end-of-workout and per-exercise feedback.
- `ProgressionSignal`: derived post-session signal used by future plan generation.

The existing plan payload should remain the public contract until mobile and backend can migrate in small steps.

## 8. Workout Player v2

Workout Player v2 should keep MoveInRange's current readiness-first and safety-first lifecycle, then add per-set execution depth.

Required behavior:

- Load the same canonical plan item ids in preview and execution.
- Start only after readiness gates pass.
- Represent exercises as a sequence of executable sets or intervals.
- Track target and actual reps, seconds, load, distance, speed, RPE/RIR, side, assisted load, and completion state when relevant.
- Support preparation, working, timed hold, rest, side switch, paused, substituting, pain check, symptom stop, and completion states.
- Allow set complete, set skipped, set added, exercise skipped, substitution accepted, and workout stopped events.
- Persist events idempotently.
- Preserve pain and symptom escalation rules over progression convenience.

The mobile state machine already has most of the required phases. The main change is adding set-level state and backend persistence instead of treating the plan item as the smallest completed unit.

## 9. Progression Engine

MoveInRange should implement an exercise-specific progression engine as a backend service or shared pure domain module. It should be deterministic, explainable, and conservative.

Recommended policies:

- `disabled`: no automatic change.
- `linear_load`: add small load after all prescribed reps are completed with acceptable effort and no safety signals.
- `double_progression`: increase reps within a range, then increase load and reset reps.
- `bodyweight_reps`: increase reps or sets before suggesting load or harder variation.
- `timed_hold`: increase seconds before adding complexity.
- `cardio_duration`: increase duration conservatively before speed/intensity.
- `rehab_hold`: repeat the same target when pain, symptoms, low readiness, or poor form feedback appears.

Every output should include the next target, confidence, reason, safety override details, and the history window used.

## 10. Timed Exercise Model

Timed exercises need first-class fields rather than overloading reps:

- `target_seconds`
- `actual_seconds`
- `target_sets`
- `actual_sets`
- `rest_seconds`
- `early_stop_reason`
- `side` for unilateral timed work
- optional `load_amount` and `load_unit`

Examples include planks, wall sits, mobility holds, isometric rehab work, breath-led drills, and interval-style conditioning. Timed work should count toward training minutes and muscle workload, but not toward rep PRs or loaded strength trends unless external load is present and clinically meaningful.

## 11. Bodyweight Model

Bodyweight is not the same as zero load. The model should distinguish:

- pure bodyweight
- assisted bodyweight
- bodyweight plus external load
- machine-loaded movement
- free-weight loaded movement

Recommended fields:

- `bodyweight_mode`: `none`, `bodyweight`, `assisted`, `added_load`
- `load_amount`
- `load_unit`
- `assistance_amount`
- `assistance_unit`
- `bodyweight_snapshot_kg`
- `variation_id` or `difficulty_variant`

Progression should avoid adding load automatically when pain/symptom/readiness signals suggest holding or regressing.

## 12. Weekly Scheduling

MoveInRange should preserve its weekly/monthly generator but add user-facing mutation semantics:

- `move`: move a planned day to a different date.
- `replace`: replace one exercise or one day focus with a compatible alternative.
- `rest`: mark the date as rest and keep the weekly template intact.
- `recovery`: swap to a low-intensity recovery session.
- `skip`: record an intentional missed day without deleting history.
- `reschedule`: move an incomplete day and update calendar state.

These operations should create plan modifications and date-specific overrides instead of rewriting historical generated plan payloads.

## 13. Workout History

Workout history should become a normalized feed built from completed sessions and set records.

Views to support:

- session list with plan source, duration, status, safety events, and feedback summary
- exercise history with recent targets versus actuals
- top set history for loaded movements
- timed hold history for timed movements
- bodyweight progression history
- skipped/substituted exercise history
- pain/symptom trend by exercise and body area
- calendar view with completion and modified-plan status

The existing completion endpoint can continue creating calendar events, but it should also finalize session exercise and set records.

## 14. Muscle Workload

Muscle workload should be based on effective sets and duration, not raw load volume alone. A safe first version:

- primary muscle set credit: 1.0 per completed hard-enough set
- secondary muscle set credit: 0.4 per completed hard-enough set
- timed work credit: completed seconds divided by target seconds, capped per set
- cardio credit: separate conditioning bucket unless mapped to specific muscles
- pain or symptom stopped sets: count as attempted but not productive workload

MoveInRange can display workload over 7, 30, and 90 day windows and use the output to avoid overloading painful or recently stressed regions.

## 15. Activity Heatmap

The activity heatmap should use completed training minutes by date. It should not count previewed plans or abandoned sessions as completed activity. Suggested intensity bands:

- none
- 1 to 9 minutes
- 10 to 24 minutes
- 25 to 44 minutes
- 45 minutes or more

The heatmap should be read-only at first and can link into the workout history screen for the selected date.

## 16. Feedback Loop

MoveInRange already captures perceived difficulty, pain, future preference, pain areas, and session-level completion. The v2 loop should add:

- set-level RPE/RIR where appropriate
- exercise-level form confidence
- substitution satisfaction
- reason for skipping a set or exercise
- reason for stopping early
- post-session safety notes

Progression must treat pain, symptoms, severe difficulty, and low readiness as stronger signals than volume completion.

## 17. Database Changes

Recommended future database work:

- Add immutable plan version tables rather than mutating generated plan payloads.
- Add planned day override tables for move/rest/recovery/skip/reschedule.
- Add normalized planned exercise and planned set tables or JSONB-backed canonical records with stable ids.
- Add workout session, session exercise, and exercise set tables.
- Add progression signal and progression recommendation tables.
- Add muscle workload materialized view or derived table.
- Add indexes for user/date/status, user/exercise/date, session/plan item id, and idempotency keys.

No database changes were made in this audit.

## 18. API Changes

Recommended future API additions:

- `GET /plans/{plan_id}/canonical`
- `POST /plans/{plan_id}/modifications`
- `POST /sessions/{session_id}/sets`
- `PATCH /sessions/{session_id}/sets/{set_id}`
- `POST /sessions/{session_id}/events`
- `GET /workout-history`
- `GET /workout-history/exercises/{exercise_id}`
- `GET /progression/exercises/{exercise_id}`
- `GET /insights/activity-heatmap`
- `GET /insights/muscle-workload`

Existing endpoints should remain supported during migration.

## 19. Mobile Changes

Recommended future mobile work:

- Extend shared plan item types with execution mode and prescription fields.
- Add set rows to the guided player.
- Add actual-value controls for reps, seconds, load, assisted load, and effort.
- Add timed exercise screens with work timer distinct from rest timer.
- Add bodyweight/assisted labels that do not imply zero load.
- Add workout history screens by session and exercise.
- Add activity heatmap and muscle workload views to the progress tab.
- Add weekly schedule mutation controls for move, rest, recovery, skip, and reschedule.

The current mobile workout phase model should be reused.

## 20. Milestone Plan

Milestone 1: Canonical model design

- Finalize exercise execution modes.
- Add shared types for prescriptions, actuals, and set state.
- Define read-compatible backend payload shape.

Milestone 2: Workout Player v2 persistence

- Add backend set/session exercise records.
- Persist set-complete, skip, substitution, pain, symptom, and completion events.
- Update mobile player to track per-set actuals.

Milestone 3: History and insights

- Build workout history APIs.
- Add activity heatmap.
- Add per-exercise history.

Milestone 4: Progression engine

- Add conservative policy engine.
- Store recommendation reasons.
- Feed recommendations into new generated plans only.

Milestone 5: Muscle workload and scheduling

- Add workload service.
- Add weekly date overrides and recovery/rest/reschedule operations.

## 21. Risks

- AGPL contamination if source is copied instead of reimplemented.
- Exercise media/data licensing uncertainty.
- Overfitting gym-style progression to MoveInRange's safety-first population.
- Increasing mobile workout friction with too many set-level controls.
- Confusing users if bodyweight, assisted, and loaded progression are not clearly labeled.
- Breaking preview/session plan parity during canonical model migration.
- Treating workload metrics as medical advice rather than coaching context.

## 22. Recommended First Implementation Sprint

Start with a narrow sprint that does not change plan generation behavior:

- Add shared TypeScript types for execution mode, prescription, set target, set actual, and session exercise state.
- Add backend database design notes and migrations in a separate reviewed PR.
- Add a compatibility mapper from current `PlanItem` payloads into canonical workout items.
- Update the mobile player internally to render set-level targets for existing reps/timed plan data.
- Persist set-complete events behind a feature flag.
- Add tests proving preview and execution use the same plan item ids.
- Add tests for readiness block, pain stop, symptom stop, and idempotent event replay.

This sprint creates the foundation for history and progression without importing openGym code or destabilizing the current beta flow.
