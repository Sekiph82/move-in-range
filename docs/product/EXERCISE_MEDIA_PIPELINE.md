# Exercise Media Pipeline

## Canonical Flow

Database `exercise_media` -> ORM `ExerciseMedia` -> API exercise payload -> plan item payload -> mobile model -> `ExerciseMediaFrame` -> rendered Home, Program, Move, Exercise Detail, Rest Preview, Substitution, and Guided Player surfaces.

## Current Production Audit

The imported dataset contains:

- Exercises: `1324`
- Localizations: `13240`
- Locales: `10`
- Exercise media rows: `1324`
- Static image path rows: `1324`
- GIF path rows: `1324`
- MP4 rows: `0`
- Approved playable external media rows: `0`
- Rows requiring external terms review before direct rendering: `1324`

Because the current media rows require external terms review, the mobile product must not claim approved licensed animation playback. Until media is approved, MoveInRange renders internal motion placeholders, localized instructions, and safe substitutions instead of blank media boxes.

## Mobile Fallback Order

1. Approved MP4.
2. Approved GIF.
3. Internal animated movement card.
4. Static internal placeholder.
5. Instructions plus safe substitution.

## Requirements

- No blank media boxes.
- Media/fallback appears in Home, Today plan, Week plan, Month plan, Exercise library, Exercise detail, Guided player, Rest preview, and Substitution screens.
- Broken or unapproved media must clearly fall back without exposing raw source paths as primary UI.
- Attribution and license state remain preserved in API payloads and admin review surfaces.
