# Workout Engine v2

Status: planning only. This document describes the recommended MoveInRange implementation path and does not represent integrated code.

## Goals

Workout Engine v2 should keep MoveInRange's existing safety-first session lifecycle while adding the workout-tracking depth users expect from a real training product.

Primary goals:

- Preserve readiness, pain, symptom, and medical-safety gates.
- Keep preview and execution plan item ids identical.
- Track workouts at session, exercise, and set levels.
- Support reps, timed work, cardio, bodyweight, assisted, and loaded movement modes.
- Emit idempotent events for every meaningful user action.
- Produce reliable history and progression inputs after completion.

## Current MoveInRange Base

The current mobile workout player already supports meaningful phases: idle, starting, preparing, working, resting, side switch, paused, substituting, pain check, transitioning, completing, completed, stopped, and error. Backend session APIs already support start, patch, event append, pain report, symptom stop, and completion. Daily plan payloads already include deterministic plan item ids, work seconds, rest seconds, sets, reps, substitutions, media, and safety context.

The missing layer is normalized exercise and set execution state.

## Canonical Runtime Shape

The player should transform every plan item into executable runtime units:

```text
WorkoutSession
  SessionExercise
    ExerciseSet
    ExerciseSet
    ExerciseSet
```

Each `SessionExercise` should include:

- `session_exercise_id`
- `session_id`
- `plan_item_id`
- `exercise_id`
- `name`
- `block`
- `order`
- `execution_mode`
- `superset_group_id`
- `status`
- `started_at`
- `completed_at`
- `substitution_source_plan_item_id`

Each `ExerciseSet` should include:

- `set_id`
- `session_exercise_id`
- `set_index`
- `side`
- `target_reps`
- `actual_reps`
- `target_seconds`
- `actual_seconds`
- `target_load_amount`
- `actual_load_amount`
- `load_unit`
- `target_distance`
- `actual_distance`
- `distance_unit`
- `target_speed`
- `actual_speed`
- `rpe`
- `rir`
- `status`
- `skip_reason`
- `early_stop_reason`

## Execution Modes

Recommended execution modes:

- `reps`: reps with optional external load.
- `bodyweight_reps`: reps where bodyweight is the primary resistance.
- `assisted_bodyweight`: reps where assistance reduces bodyweight resistance.
- `timed`: seconds-based work such as planks, holds, intervals, or mobility positions.
- `cardio_duration`: duration-first cardio.
- `cardio_distance`: distance-first cardio.
- `breathing`: breath-led work where reps may mean breaths rather than muscular repetitions.
- `mobility_flow`: continuous flow where completion is duration and perceived comfort.

The first implementation can support `reps`, `bodyweight_reps`, `assisted_bodyweight`, and `timed`, then add cardio detail later.

## State Machine

The existing mobile phase model should remain the outer state machine. v2 adds set-level transitions inside the working phase:

```text
preview -> readiness -> session_start -> exercise_prepare -> set_work
  -> set_complete -> rest -> next_set
  -> exercise_complete -> next_exercise -> session_complete
```

Interruptions:

- pause/resume keeps current set context.
- pain check can continue, substitute, or stop.
- symptom report stops the workout and invalidates active timers.
- skip set records a skipped set without deleting it.
- skip exercise records all remaining sets as skipped with a shared reason.
- substitute creates a new session exercise linked to the original plan item.

## Timer Rules

Timed work must have a work timer distinct from the rest timer.

Rules:

- `target_seconds` is the planned work duration.
- `actual_seconds` is the completed duration when the user stops early or completes.
- Rest starts only after work is completed, skipped, or stopped.
- Paused time is excluded from actual work duration.
- Side-switch timers are separate from rest timers.
- Symptom and severe-pain stops cancel active timers and persist stop events.

## Persistence

Backend persistence should use append-only events plus current-state tables.

Recommended event types:

- `session_started`
- `exercise_started`
- `set_started`
- `set_completed`
- `set_skipped`
- `rest_started`
- `rest_completed`
- `exercise_completed`
- `exercise_skipped`
- `substitution_selected`
- `pain_reported`
- `symptoms_reported`
- `session_paused`
- `session_resumed`
- `session_completed`
- `session_stopped`

Every client-generated event should include an idempotency key. Server writes should be safe to replay.

## Safety Priority

Safety behavior outranks progression and streak goals:

- Readiness block prevents start.
- Severe pain stops or forces substitution according to the existing backend rules.
- Symptoms stop the session.
- Pain and symptoms should become progression hold/regression signals.
- Completed sets after a stop should not be inferred.

## Mobile UX

The v2 UI should stay quick to use:

- Show target and actual controls only for the current set.
- Pre-fill actuals with the target so a normal set needs one tap.
- Use steppers for reps and load.
- Use a timer ring or compact timer for timed work.
- Use separate controls for pain, skip, substitute, and finish.
- Keep safety copy brief and action-oriented.

## API Contract

New endpoints can be additive:

- `POST /sessions/{session_id}/exercises`
- `PATCH /sessions/{session_id}/exercises/{session_exercise_id}`
- `POST /sessions/{session_id}/sets`
- `PATCH /sessions/{session_id}/sets/{set_id}`
- `POST /sessions/{session_id}/events`

Existing session start, pain, symptom, and complete endpoints should remain available during migration.

## Test Plan

Required tests:

- readiness blocked session cannot create active set state
- preview and player receive identical plan item ids
- start/resume is idempotent
- set completion stores target and actual values
- timed early stop stores actual seconds
- pain stop records event and prevents inferred completion
- symptom stop cancels active timers
- skipped sets are visible in history
- substituted exercises retain original plan item linkage
- completed session creates history records and calendar event
