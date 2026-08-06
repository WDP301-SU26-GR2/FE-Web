# Mangaka profile and chapter dialog language cleanup

## Scope

Correct the Vietnamese UI strings requested for the Mangaka profile and the
create-chapter dialog. This is a presentation-only change; no API contract,
form payload, or chapter-creation behavior changes.

## Design

- In `app/locales/vi/profile.json`, replace the visible profile `Portfolio`
  labels with `Danh mục dự án`, including the profile section/field labels and
  the portfolio image alt text. Keep the existing i18n keys so components and
  API data remain unchanged.
- In `CreateChapterDialog`, remove the read-only `seriesId` block so an internal
  identifier is never shown to users.
- Remove the create-chapter explanatory paragraph and its `aria-describedby`
  reference because the requested description must no longer appear.
- In `app/locales/vi/mangaka.json`, translate the create-chapter dialog's
  remaining user-facing `chapter` wording to `chương` (title, confirmation,
  progress, success, and error strings). Remove the now-unused description key
  from both Vietnamese and English locale objects.
- Keep the English UI unchanged except for removing the unused description
  key, preserving the supported language's existing wording.

## Verification

- Add or update a focused test/fixture that proves the create dialog does not
  render the series ID or description and uses the translated labels.
- Verify locale JSON remains valid and run the project's typecheck, lint, and
  relevant test command if available.

## Out of scope

- Renaming TypeScript/API fields such as `portfolioFiles`, `seriesId`, or
  `chapterNumber`.
- Changing chapter creation requests, validation, navigation, or backend data.
