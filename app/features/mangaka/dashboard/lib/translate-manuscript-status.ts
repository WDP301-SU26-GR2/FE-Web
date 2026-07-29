type Translate = (key: string) => string

const MANUSCRIPT_STATUS_KEYS: Record<string, string> = {
  DRAFT: 'dashboard.studio.subtitleDraft',
  IN_PRODUCTION: 'dashboard.studio.subtitleInProduction',
  EDITOR_REVIEW: 'dashboard.studio.subtitleEditorReview',
  EDITOR_REVISION: 'dashboard.studio.subtitleEditorRevision',
  READY_FOR_PRINT: 'dashboard.studio.subtitleReadyForPrint',
  AWAITING_CO_OWNER_APPROVAL: 'dashboard.studio.subtitleAwaitingCoOwner',
  PUBLISHED: 'dashboard.studio.subtitlePublished'
}

export function translateManuscriptStatus(status: string | null | undefined, t: Translate): string {
  return t(MANUSCRIPT_STATUS_KEYS[status ?? ''] ?? 'state.unknown')
}
