import { useCallback, useEffect, useState } from 'react'

import { chapterControllerProgress } from '~/api/operations/chapters/chapters'
import type { ChapterProgressResDtoOutput } from '~/api/model/chapters'

const PROGRESS_POLL_INTERVAL_MS = 15_000

export function useChapterProgress(chapterId: string | null | undefined) {
  const [progress, setProgress] = useState<ChapterProgressResDtoOutput | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!chapterId) return

    let cancelled = false
    const controller = new AbortController()

    const load = async () => {
      try {
        const res = await chapterControllerProgress({ id: chapterId }, { signal: controller.signal })
        if (!cancelled) setProgress(res.data as ChapterProgressResDtoOutput)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        // Progress is supplementary. Keep the most recent successful snapshot
        // when a polling request fails instead of disrupting the workbench.
      }
    }

    void load()
    const intervalId = window.setInterval(() => void load(), PROGRESS_POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      controller.abort()
      window.clearInterval(intervalId)
    }
  }, [chapterId, reloadToken])

  const refresh = useCallback(() => setReloadToken((value) => value + 1), [])

  return { progress, refresh }
}
