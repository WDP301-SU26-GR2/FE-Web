import type { EditorPublicationData } from '../types'

export type PublicationGroup = 'review' | 'approved' | 'progress' | 'history'

const REVIEW_STATUSES = new Set(['EDITOR_REVIEW'])
const APPROVED_STATUSES = new Set(['READY_FOR_PRINT', 'AWAITING_CO_OWNER_APPROVAL'])

export function getPublicationGroupForStatus(status: string | null | undefined): PublicationGroup {
  if (REVIEW_STATUSES.has(status ?? '')) return 'review'
  if (APPROVED_STATUSES.has(status ?? '')) return 'approved'
  if (status === 'PUBLISHED') return 'history'
  return 'progress'
}

export function groupPublicationItemsBySeries(items: EditorPublicationData['chapters']) {
  const groups = new Map<string, { series: EditorPublicationData['chapters'][number]['series']; chapters: EditorPublicationData['chapters'] }>()

  items.forEach((item) => {
    const existing = groups.get(item.series.id)
    if (existing) {
      existing.chapters.push(item)
      return
    }

    groups.set(item.series.id, {
      series: item.series,
      chapters: [item]
    })
  })

  return Array.from(groups.values())
}
