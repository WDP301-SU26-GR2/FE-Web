# Remove Assistant Chapter Pages Design

## Goal

Remove the redundant chapter overview page from the Assistant dashboard without affecting chapter and task APIs or other chapter-related workflows.

## Scope

The page shown in the reported screenshot is the Assistant route `/dashboard/assistant/chapter-pages`. The removal covers every page-specific entry point and translation block:

- Delete `app/routes/assistant/chapter-pages.tsx`.
- Remove the `chapter-pages` route registration from `app/routes.ts`.
- Remove the Assistant sidebar item from `app/shared/components/dashboard-nav-config.tsx`.
- Remove the `nav.chapterPages` key from both `app/locales/en/common.json` and `app/locales/vi/common.json`.
- Remove the `chapterPages` translation object from both `app/locales/en/assistant.json` and `app/locales/vi/assistant.json`.

The generated API models, chapter operations, task operations, and shared signed-URL hook remain in place because they support other Assistant, Mangaka, or publication workflows.

## Behavior

After the change:

- The Assistant sidebar no longer displays the chapter overview entry.
- `/dashboard/assistant/chapter-pages` is no longer a registered route.
- No page-specific navigation or translation lookup remains.
- Existing Assistant task, studio, invite, notification, profile, and dashboard routes are unchanged.

## Verification

Use repository searches to confirm that `chapter-pages` and `chapterPages` no longer have page-specific references, while shared chapter API references remain where needed. Run:

```bash
npm run typecheck
npm run lint
```

The implementation is complete only when both commands exit successfully and the route, navigation, component, and locale cleanup are visible in the final diff.

## Constraints

- Do not alter generated files under `app/api/`.
- Do not remove shared chapter/task operations or hooks used by other workflows.
- Follow the project token, dependency, route, and bilingual locale conventions.
- Do not commit unless explicitly requested by the user.
