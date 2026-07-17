import { useMemo } from 'react'

import { useChapter } from './use-chapter'
import { useChapterName } from './use-chapter-name'
import { useChapterPages } from './use-chapter-pages'

/**
 * Composed fetch hook used by `publication-shell.tsx`. It wraps three underlying
 * hooks (`useChapter`, `useChapterName`, `useChapterPages`) and exposes a single
 * `refreshAll()`. The three hooks already cache and cancel their own requests,
 * so keeping them decoupled lets a child route call just one refetch after its
 * own mutation without re-fetching the others.
 */
export function usePublicationData(chapterId: string | null | undefined) {
  const chapterQ = useChapter(chapterId)
  const nameQ = useChapterName(chapterId)
  const pagesQ = useChapterPages(chapterId)

  const refreshAll = useMemo(
    () => () => {
      chapterQ.refresh()
      nameQ.refresh()
      pagesQ.refresh()
    },
    [chapterQ, nameQ, pagesQ]
  )

  return {
    chapter: chapterQ.chapter,
    chapterLoading: chapterQ.isLoading,
    chapterError: chapterQ.error,
    chapterNotFound: chapterQ.notFound,
    refreshChapter: chapterQ.refresh,
    name: nameQ.name,
    nameLoading: nameQ.isLoading,
    nameError: nameQ.error,
    refreshName: nameQ.refresh,
    pages: pagesQ.pages,
    pagesLoading: pagesQ.isLoading,
    pagesError: pagesQ.error,
    refreshPages: pagesQ.refresh,
    refreshAll
  }
}
