# Admin UI worklog

## Scope

This work continues the Admin Operations page at `/admin/activity` and normalizes every Admin dropdown that could fall back to a browser-owned light/native menu.

## Operations layout

- Retained the `System overview` page with the `Overview`, `Sessions`, `Observability`, and `Audit` views.
- Added an animated, labelled view stage when switching views.
- Made the Overview layout use the available page height: the KPI row remains at the top and the `Today` and `Needs attention` panels fill the remaining area.
- Added contextual data to the two lower panels instead of leaving them visually empty.
- Added a reduced-motion fallback for view and menu animation.
- Verified captured layouts at 390px, 768px, and 1366px do not leave a background gap below the lower panels.

## Shared dropdown control

Created a shared component:

- `frontend/components/admin/AdminSelect.jsx`
- `frontend/components/admin/AdminSelect.module.css`

It replaces browser-native selects with a consistent dark menu and provides:

- dark theme, hover, focus-visible state, selected checkmark, and 150ms transition;
- `menu` and `menuitemradio` accessibility semantics;
- close on Escape and outside pointer interaction;
- reduced-motion support.

## Replaced controls

- Operations: View switcher and Audit action filter.
- User management: role filter and activity sort.
- Course settings: status, level, and category.
- Lesson settings: chapter, status, solution check, and difficulty.
- Content Studio: lesson difficulty. The hidden native select in the course picker was removed; its existing bespoke course picker remains in use.

## Content Studio reliability fix

The selected course is now preserved when the initial asynchronous course load finishes after a person has already chosen a course. This prevents the initial request from overwriting that interaction.

## Test and verification work

- Migrated relevant E2E interactions from `selectOption()` to the new menu actions.
- The Audit action-filter E2E flow passed.
- Updated the Content Studio test assertion because the current Studio UI no longer renders the old `DRAFT` badge.
- `git diff --check` passed.
- `npm run build` passed.
- A source scan found no remaining `<select>` or `selectOption` use in the Admin component and relevant E2E test scope.
- The project has one pre-existing lint warning in `components/layout/SmoothScroll.jsx` about the `duration` dependency; it is unrelated to these Admin changes.

## Captures

- `/home/light/.gemini/antigravity-cli/brain/1452835d-ecd2-4990-8c8e-966c5ec35541/admin-activity-390_mobile.png`
- `/home/light/.gemini/antigravity-cli/brain/1452835d-ecd2-4990-8c8e-966c5ec35541/admin-activity-768_tablet.png`
- `/home/light/.gemini/antigravity-cli/brain/1452835d-ecd2-4990-8c8e-966c5ec35541/admin-activity-1366_desktop.png`

## Notes

No commit was made. Unrelated tunnel and concurrent workspace changes were not modified intentionally.
