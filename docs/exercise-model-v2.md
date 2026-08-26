# Exercise Model v2

Status: planning only. This document defines a future exercise and prescription model for MoveInRange.

## Objectives

Exercise Model v2 should support:

- safe exercise selection
- canonical workout execution
- timed, reps, cardio, bodyweight, assisted, and loaded modes
- muscle workload
- substitution matching
- exercise-specific progression
- media and license review
- localization

The model should extend the current API/import/shared-type foundation rather than replacing it.

## Current Strengths

MoveInRange already has:

- exercise import pipeline
- localized exercise records
- exercise media records
- exercise tags
- source metadata and deterministic hashes
- media manifest status and license status
- derived safety and accessibility tags
- mobile plan items with instructions, safety notes, substitutions, media, unilateral flags, and side-switch data

The v2 work should mainly make execution and anatomical semantics explicit.

## Canonical Fields

Recommended exercise-level fields:

- `exercise_id`
- `slug`
- `name`
- `category`
- `body_part`
- `primary_muscles`
- `secondary_muscles`
- `equipment_required`
- `equipment_optional`
- `execution_capabilities`
- `default_execution_mode`
- `difficulty`
- `impact`
- `position`
- `unilateral`
- `side_switch_required`
- `contraindication_tags`
- `accessibility_tags`
- `media`
- `instructions`
- `breathing_cues`
- `common_mistakes`
- `safety_notes`
- `source_metadata`
- `license_status`
- `review_status`

## Muscle Mapping

Muscles should be structured records instead of free-form strings.

Recommended shape:

```text
ExerciseMuscle
  muscle_code
  role: primary | secondary | stabilizer
  workload_weight
  confidence
  source
```

Suggested first muscle set:

- chest
- upper_back
- lats
- shoulders
- biceps
- triceps
- forearms
- core_abs
- obliques
- lower_back
- glutes
- quadriceps
- hamstrings
- calves
- hip_flexors
- adductors
- abductors
- cardio

## Execution Capabilities

Each exercise should declare which modes it can support:

- `reps`
- `bodyweight_reps`
- `assisted_bodyweight`
- `timed`
- `cardio_duration`
- `cardio_distance`
- `mobility_flow`
- `breathing`

Capabilities allow the planner to choose the right prescription type without guessing from equipment or category.

## Prescription Model

Recommended prescription fields:

- `execution_mode`
- `sets`
- `reps`
- `min_reps`
- `max_reps`
- `seconds`
- `distance`
- `distance_unit`
- `speed`
- `speed_unit`
- `load_amount`
- `load_unit`
- `assistance_amount`
- `assistance_unit`
- `rest_seconds`
- `preparation_seconds`
- `tempo`
- `rir_target`
- `rpe_cap`
- `side_policy`

Only fields relevant to the selected execution mode should be required.

## Bodyweight Semantics

Bodyweight movement requires explicit modeling:

- `bodyweight`: resistance is the user's bodyweight
- `assisted`: external support reduces resistance
- `added_load`: bodyweight plus external load
- `machine_loaded`: machine or cable load is the primary external load
- `free_weight_loaded`: dumbbell, barbell, kettlebell, or similar

This distinction keeps history and progression meaningful.

## Timed Semantics

Timed exercises should not be represented as fake reps.

Required timed fields:

- target seconds
- actual seconds
- early stop reason
- side when unilateral
- optional load
- optional comfort or effort rating

Timed work should feed adherence, workload, and safety trends, but should not feed ordinary rep PRs.

## Substitution Matching

Substitution should use:

- primary muscle overlap
- movement pattern
- equipment availability
- impact
- position
- unilateral requirements
- contraindications
- user feedback history
- safety profile

Substitutions should carry the original plan item id when used during a workout.

## Media and Licensing

The model should keep media licensing explicit:

- source URL
- source dataset
- source version
- asset hash
- local storage key
- license status
- review status
- attribution text
- reviewer id
- reviewed at

No exercise media or instructions from openGym should be reused without independent license verification.

## Migration Path

Recommended sequence:

- Add shared types for execution capabilities and prescriptions.
- Add backend fields or JSONB metadata for v2 exercise semantics.
- Backfill first-party imported exercises with conservative defaults.
- Mark uncertain anatomical mappings as review required.
- Update plan generation to emit canonical prescription fields alongside existing fields.
- Update mobile to consume canonical fields when available and fall back to current fields otherwise.

## Tests

Required tests:

- exercise import preserves license and source metadata
- classifier populates execution capabilities
- timed exercise does not require reps
- bodyweight exercise distinguishes added load from assistance
- substitution matching respects contraindications
- canonical plan mapping is backward compatible
- unknown muscle mappings are review required
