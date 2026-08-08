# Remove Mangaka Ranking Design

## Goal

Remove the ranking function from the Mangaka role without changing ranking capabilities that belong to Board, Public, Editor, or shared generated API contracts.

## Scope

- Remove the Mangaka ranking route `/dashboard/mangaka/rankings` and its route entry file.
- Remove the Mangaka ranking feature directory and its barrel exports.
- Remove the ranking item from the Mangaka dashboard navigation.
- Remove the ranking card from the Mangaka dashboard and stop exposing dashboard ranking data through the Mangaka dashboard hook.
- Remove the Mangaka notification deep-link for `SURVEY_*` and `RANKING_*` from both the Mangaka notification page and shared notification bell, which would otherwise point to the removed page.
- Remove translation keys used only by the removed Mangaka ranking UI and navigation.

## Out of scope

- Keep Board ranking routes/features and all Public/Editor/Admin survey functionality.
- Keep generated `app/api/model` and `app/api/operations` files; they are generated from Swagger and may be used by other roles.
- Keep Finance translations and behavior for `RANKING_MILESTONE` payment conditions.
- Do not change backend contracts or FE-Web-Guide documentation.

## Verification

- A route contract test must fail before the route is removed and pass afterward, asserting that Mangaka has no rankings route while Board still does.
- `npm run test` must pass.
- `npm run typecheck` and `npm run lint` must pass.
- A final search must show no Mangaka code path linking to `/dashboard/mangaka/rankings` or importing `features/mangaka/rankings`.
