# Remove Mangaka Publication Versions

## Goal

Remove the read-only "Publication versions" section from the Mangaka series-detail experience.

## Scope

- Remove the panel and its data-loading hook from `MySeriesDetailPage`.
- Delete the Mangaka-only panel and hook because they have no other consumers.
- Remove the unused `seriesDetail.publicationVersions` translations from both Vietnamese and English resources.
- Keep publication-version operations and references for Editor, Admin, and Board unchanged.

## Verification

Use a reference search, TypeScript typecheck, and ESLint. No test runner is configured in this repository; source-text tests would not validate user-facing behavior.
