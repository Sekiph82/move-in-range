# Exercise Library UX

## Move Tab

The Move tab is the primary exercise library entry. It uses a two-column visual grid, debounced search, dataset-derived filters, result counts, favorites, and recently viewed exercises.

## Search

Search calls the API with a debounced query and preserves active filters. The backend searches exercise name, body area, target, equipment, and localized instruction text.

## Filters

Filters are derived from dataset/API values where available:

- Body area
- Equipment
- Target muscle
- Position
- Difficulty
- Impact
- Bodyweight
- Favorites

Health suitability filters are intentionally not exposed until reviewed health metadata exists. MoveInRange does not label exercises as condition-safe from names alone.

## Media Policy

Cards use static thumbnails when approved hosted HTTPS media exists. Detail screens may show GIF animation when approved hosted GIFs are available. Until legal/media approval is complete, cards and detail screens render an instruction-guided fallback state rather than blank frames.

## Favorites and Recents

Favorites persist through the authenticated API and support add/remove. Recently viewed exercises are bounded local device state and are not synchronized unless a later backend design explicitly supports it.

## Offline Behavior

The mobile app caches recent library pages, last-used filters, and recently viewed exercises. If the API is unavailable, cached pages can remain visible with a cached-state indicator. Media cache policy is intentionally bounded: do not preload all GIFs.

## Accessibility

Exercise cards use accessible labels, large touch targets, text instructions, and non-GIF fallback guidance. GIFs are not the only way to understand a movement.
