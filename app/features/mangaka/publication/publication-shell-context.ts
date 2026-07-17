import { createContext, useContext } from 'react'

import { isFetchError } from '~/api/mutator/custom-fetch'
import type { ChapterResDtoOutput } from '~/api/model/chapters'
import type { NameListResDtoOutputItemsItem } from '~/api/model/names'
import type { PageListResDtoOutputItemsItem } from '~/api/model/chapters'

/**
 * Publication shell context — shares chapter + name + pages data (and refresh
 * triggers) between the shell layout and its two child routes (Name view +
 * Page view). Fetched once at the shell so neither route refetches.
 *
 * Defensive: each piece (chapter, name, pages) is independently nullable —
 * callers should treat absent data as "still loading" or "not yet created"
 * depending on the field. Refresh helpers re-run each underlying hook;
 * `refreshAll()` does them in sequence.
 */
export type PublicationContextValue = {
  seriesId: string
  chapterId: string
  chapter: ChapterResDtoOutput | null
  chapterLoading: boolean
  chapterError: string | null
  chapterNotFound: boolean
  name: NameListResDtoOutputItemsItem | null
  nameLoading: boolean
  pages: PageListResDtoOutputItemsItem[]
  pagesLoading: boolean
  refreshChapter: () => void
  refreshName: () => void
  refreshPages: () => void
  refreshAll: () => void
  backHref: string
}

export const PublicationContext = createContext<PublicationContextValue | null>(null)

/**
 * Use the Publication context. Throws if a child renders outside a
 * `PublicationShell` so we fail loudly instead of silently breaking the UI.
 */
export function usePublicationContext(): PublicationContextValue {
  const ctx = useContext(PublicationContext)
  if (!ctx) {
    throw new Error('usePublicationContext must be used inside <PublicationShell>')
  }
  return ctx
}

/** Predict whether a published-data error means "not yet created" (404) vs a real failure. */
export function isMissingRecordError(err: unknown): boolean {
  return isFetchError(err) && (err.status === 403 || err.status === 404)
}

export type { PageListResDtoOutputItemsItem }
