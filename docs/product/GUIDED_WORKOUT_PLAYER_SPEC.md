# Guided Workout Player Spec

## State Machine

The player uses these states:

`IDLE`, `STARTING`, `PREPARING`, `WORKING`, `RESTING`, `SIDE_SWITCH`, `PAUSED`, `SUBSTITUTING`, `PAIN_CHECK`, `TRANSITIONING`, `COMPLETING`, `COMPLETED`, `STOPPED`, `ERROR`.

## State Data

State stores program, plan, session, ordered items, active index/set/side, phase timestamps, durations, remaining time, elapsed time, pause/background timestamps, completed/skipped/substituted items, pain/symptom events, media state, cue state, sync state, and completion state.

## UX Requirements

- Dedicated full-screen player.
- Above the fold: section, exercise name, animation/fallback, large timer, phase, set/session progress, concise instructions, and primary controls.
- Working/resting controls: pause, skip, substitute, pain, sound.
- Paused controls: resume, end.
- Completion controls: feedback, return.
- Start must not remain pending indefinitely.
- Completion is idempotent and happens exactly once.

## Timing

Timing is timestamp-based and supports preparation, work, rest, side switch, pause/resume, background/foreground recovery, and restart recovery. Default preparation is five seconds unless the plan item specifies otherwise.

## Cues

Local cues cover get ready, countdown, start, final seconds, rest, next movement, switch side, paused, resumed, and complete. Sound and haptics are optional user preferences; silent use remains supported.
