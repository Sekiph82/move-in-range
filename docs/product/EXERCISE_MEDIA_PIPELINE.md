# Exercise Media Pipeline

## Canonical Flow

Database `exercise_media` -> ORM `ExerciseMedia` -> API exercise payload -> plan item payload -> mobile model -> `ExerciseMediaFrame` -> rendered Home, Program, Move, Exercise Detail, Rest Preview, Substitution, and Guided Player surfaces.

## Current Production Audit

The imported dataset contains:

- Exercises: `1324`
- Localizations: `13240`
- Locales: `10`
- Exercise media rows: `1324`
- Hosted HTTPS thumbnail rows: `1324`
- Hosted HTTPS GIF rows: `1324`
- MP4 rows: `0`
- Playable hosted media rows: `1324`
- Local file URL rows: `0`

The beta media pipeline now stores thumbnails and GIFs in Supabase Storage and stores only stable HTTPS URLs in PostgreSQL. Mobile, web, and admin clients must consume these URLs through the FastAPI exercise payloads rather than reading local JSON or local media files.

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

## Phase 2 Import Pipeline

The production pipeline is:

1. Validate the local JSON and media files with `scripts/audit-exercise-dataset.mjs`.
2. Generate `.local/exercise-media-manifest.v1.json` with checksums, dimensions, frame counts, and optional hosted HTTPS URLs.
3. Upload approved media to immutable object paths such as `exercise-media/v1/images/<filename>.jpg` and `exercise-media/v1/videos/<filename>.gif`.
4. Import the manifest with the existing exercise importer.
5. Expose only canonical HTTPS media descriptors through the API.

No local file URL is valid in production. The importer stores locally referenced media as `review_required` when hosted URLs are absent, and stores hosted rows as `available` only when the manifest contains HTTPS thumbnail and GIF URLs.

## Canonical API Object

```json
{
  "thumbnail_url": "https://...",
  "gif_url": "https://...",
  "media_type": "gif",
  "playable": true,
  "status": "available",
  "width": 180,
  "height": 180,
  "version": "v1"
}
```

When media is not approved, URLs are empty, `playable` is false, and the mobile client renders the instruction-guided fallback state.
