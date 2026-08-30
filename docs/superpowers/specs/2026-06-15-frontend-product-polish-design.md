# Frontend Product Polish Design

## Context

PTIT Learning is a product app with three connected learner surfaces: course discovery, course decision, and active learning. The first polish pass should modernize the interface without changing data fetching, route structure, backend APIs, role flows, or purchase/learning logic.

## Scope

This pass covers:

- Search and course catalog cards.
- Course detail purchase and content overview.
- Learning player sidebar, video area, lesson metadata, tabs, notes, and progress states.
- Shared storefront/product tokens used by those surfaces.

This pass does not cover admin/teacher feature changes, checkout logic, backend work, major IA changes, or a full component-library migration.

## Design Direction

Use a restrained modern product UI language: clean surfaces, solid primary actions, subtle borders, stable spacing, and state-driven motion. Keep Be Vietnam Pro. Prefer one consistent blue/indigo primary vocabulary over the current mix of black CTAs, bright blue, purple gradients, and inline one-off colors.

## Search and Course Cards

Course cards should feel like reliable catalog objects rather than decorative marketing cards. Keep the image, title, description, meta, rating, and price structure, but reduce heavy shadow and gradient usage. Wishlist becomes a compact icon-like control with clearer active/inactive states. Badges use consistent token colors and no inline background overrides. Search results and pagination should use reusable class names rather than inline styles.

## Course Detail

Keep the existing two-column hero. Make the purchase sidebar feel more trustworthy by using a white surface, clear price hierarchy, solid primary CTA, outline secondary actions, and consistent note list styling. The learning-outcomes block should remain scannable but less card-heavy. Review summary and progress bars keep their behavior, but visual styling should align with the shared product tokens.

## Learning Player

Keep the header, sidebar, video, lesson info, tabs, notes, and quiz flow. Improve state readability: active, completed, locked, current progress, and unavailable video should be visually distinct without relying on emoji. Sidebar motion should avoid animating layout properties where practical. Tabs and lesson action controls should match the shared button and token system.

## Motion

Use short 150-250ms transitions for hover, selected, and sidebar states. Remove bounce/elastic-feeling animations from the polished surfaces. Add reduced-motion fallbacks for new or changed transitions.

## Acceptance Criteria

- Search, Course Detail, and Learning Player use the same product token vocabulary.
- Main CTAs on these surfaces use solid primary style, with secondary actions as outline/quiet actions.
- No new route, API, or business-logic behavior is introduced.
- Existing loading, empty, and error states still render.
- Build passes with `npm.cmd run build` from `web`.
- Detector warnings for the touched surfaces are reduced where practical, especially gradient-heavy CTA and bounce/layout-motion issues.
