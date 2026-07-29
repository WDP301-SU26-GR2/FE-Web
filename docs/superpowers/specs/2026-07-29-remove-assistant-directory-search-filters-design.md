# Remove assistant-directory search filters

## Goal

Remove the search-and-availability control block from the Mangaka assistant
directory: name search, available-from date, available-to date, and level
search.

## Scope

- Keep the specialization chips and their filtering behavior.
- Keep the assistant card grid, pagination, error state, empty state, and
  invitation/profile workflows unchanged.
- Remove the four inputs above and all page/hook state, callbacks, and API
  query parameters that exist only to support them.
- Remove the matching English and Vietnamese translation keys when they are no
  longer referenced.

## Design

`AssistantDirectoryPage` will retain its specialization-filter row but remove
the right-hand input grid and its local input state/handlers. Its empty-state
reset action will reset specialization only.

`useAssistantDirectory` will fetch pages using pagination and the selected
specialization only. It will no longer expose or track `level`, `query`,
`availableFrom`, or `availableTo`, and will omit those parameters from the
generated API call.

## Validation

Run a focused static check that confirms the removed filter symbols and locale
keys have no remaining references, then run `npm run typecheck`.
