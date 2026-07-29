# Remove Mangaka Reprint Flow Design

## Decision

The reprint workflow is no longer a supported Mangaka frontend capability. Remove its discoverable UI, route entry points, route-scoped API calls, feature components, Mangaka deep-link, and dedicated translations.

## Scope

Remove only the Mangaka frontend flow:

- `/dashboard/mangaka/reprints`
- `/dashboard/mangaka/reprints/:id/chapters/:chapterId`
- Mangaka sidebar entry and document title
- Mangaka `REPRINT_*` notification destination
- Mangaka reprint page/component exports
- the dedicated `mangaka.reprints` EN/VI locale tree
- Mangaka coverage/parity expectations for reprint endpoints

Preserve:

- Orval-generated `app/api/model/reprint-requests/**` and `app/api/operations/reprint-requests/**`
- `FE-Web-Guide/**` as backend/reference documentation
- Editor, Board, and Admin reprint flows
- generic/historical payment source labels such as `finance.source.REPRINT`
- shared notification/audit enum labels used by other roles

## Behavior

After removal, Mangaka users cannot discover or navigate to a reprint screen. A Mangaka `REPRINT_*` notification remains readable but has no target link because there is no supported Mangaka destination. Editor and Board `REPRINT_*` notification links remain unchanged.

The Mangaka API coverage audit treats the six guide-documented reprint routes as explicit product exclusions:

- `GET /reprint-requests`
- `GET /reprint-requests/:id`
- `GET /reprint-requests/:id/chapters`
- `GET /reprint-requests/:id/chapters/:chapterId`
- `PATCH /reprint-requests/:id/chapters/:chapterId/manuscript`
- `PATCH /reprint-requests/:id/mangaka-review`

## Verification

- A regression test verifies the public Mangaka route/nav/deep-link/locale surface no longer exposes reprints while Editor and Board links remain.
- The existing Mangaka read-parity check continues to validate finance behavior without requiring deleted reprint files.
- Mangaka API coverage reports the removed endpoints as excluded rather than missing.
- i18n JSON parses and EN/VI key parity remains valid.
- Scoped lint/prettier, project lint, and typecheck are run; any pre-existing failures are reported separately from this change.
