// Internal barrel — the publication feature is consumed exclusively by its
// route entry files under `app/routes/publish/*` which import directly from
// sibling module paths (`./publication-name-view`, `./publication-pages-view`,
// etc.). The shell + context are exposed on `features/mangaka` so cross-
// feature (rare) callers can mount the same header/context combo if needed.
//
// Keep this file minimal: any public re-export here must reference a file
// that exists at build time. No zombie re-exports.
export { PublicationShell } from './publication-shell'
export { PublicationContext, usePublicationContext } from './publication-shell-context'
