# Workout History

Status: planning only. This document describes the future normalized history layer for MoveInRange.

## Purpose

Workout history should become the reliable source for:

- user-visible session history
- per-exercise trends
- activity heatmaps
- muscle workload
- progression recommendations
- safety and pain trend review
- calendar completion state

Current MoveInRange completion records and calendar events are a good start, but v2 needs normalized session, exercise, and set records.

## History Entities

Recommended records:

- `WorkoutSession`: one started workout.
- `SessionExercise`: one planned or substituted exercise inside a session.
- `ExerciseSet`: one completed, skipped, or stopped set or interval.
- `WorkoutFeedback`: session-level and exercise-level feedback.
- `SessionSafetyEvent`: pain, symptom, readiness, stop, or substitution event.
- `CalendarEvent`: existing date-level activity record.

## Session History View

The main history list should show:

- date
- plan source
- session status
- completed duration
- exercises completed
- skipped or substituted exercises
- pain or symptom indicators
- perceived difficulty
- future preference

Status values should distinguish completed, stopped for symptoms, stopped for pain, skipped, abandoned, and in progress.

## Exercise History View

Each exercise should show:

- recent sessions
- planned target versus actual result
- best recent set
- trend direction
- substitutions from or to this exercise
- pain reports tied to the exercise
- notes and feedback

Mode-specific displays:

- loaded reps: load x reps, estimated strength trend when appropriate
- bodyweight reps: reps, sets, assistance or added load
- timed: target seconds and actual seconds
- cardio: duration, distance, speed, or intensity

## Set History

Set records should preserve both target and actual values. This matters because progression and feedback depend on the difference.

Examples:

- target 3 x 10 reps, actual 10/10/8
- target 3 x 45 seconds, actual 45/39/skipped
- target bodyweight 3 x 8, actual 8/8/8, perceived easy
- target assisted pull-up 3 x 6 at 30 kg assistance, actual 6/5/5

Skipped and stopped sets should remain visible and should not be converted into failed completed sets.

## Activity Calendar

The existing calendar event flow should continue, but the history layer should define consistent activity metrics:

- completed training minutes
- started but not completed minutes
- rest/recovery day markers
- skipped day markers
- safety-stop markers
- rescheduled day markers

The activity heatmap should only count completed training minutes unless a separate "attempted activity" overlay is added.

## Import and Backfill

External import should be treated as history ingestion, not as generated plans.

Recommended import behavior:

- preserve source app and source ids
- match exercises by normalized names and aliases
- create review-required custom exercises for unmatched records
- convert units explicitly
- preserve timestamps
- preserve RPE/RIR when available
- mark imported history as user-supplied

Imported workouts can feed insights only after exercise matches and units are trusted.

## Privacy and Safety

Workout history may reveal medical and behavioral patterns. The API should enforce the same user isolation, admin authorization, and auditability standards as other health-adjacent data.

Sensitive history events include:

- symptoms
- pain areas
- diabetes context
- clinician restrictions
- readiness blocks
- recovery recommendations

## API Additions

Recommended endpoints:

- `GET /workout-history`
- `GET /workout-history/{session_id}`
- `GET /workout-history/exercises/{exercise_id}`
- `GET /workout-history/calendar`
- `GET /workout-history/imports`
- `POST /workout-history/imports`

## Tests

Required tests:

- completed session appears in history
- stopped session preserves stop reason
- skipped sets remain skipped
- substitution links original and replacement exercise
- exercise history separates modes correctly
- imported unit conversion is explicit
- users cannot read another user's history
- history dates match the user's timezone rules
