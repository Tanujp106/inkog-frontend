# Room OG First-Share Design

## Goal

Make a newly created room link render an Open Graph image on the first share without a backend request or dynamic image generation.

## Decision

Room metadata will use fixed, factual invite copy and the existing public `/og-image.png` asset. The room route will not call the room API while generating metadata. This preserves a reliable preview at the cost of omitting the room topic and password state from shared-link metadata.

## Boundaries

- Frontend-only; no backend, schema, storage, or deployment changes.
- Keep rooms noindex and retain the existing canonical room URL.
- Leave the existing dynamic GIF route intact but unused by room metadata.

## Verification

- Unit-test that the room OG image path is the static PNG and that room title and description are generic.
- Run the focused metadata and image tests.
- Build and inspect the emitted landing metadata; the room route remains server-rendered but no longer imports or executes the room API helpers.
