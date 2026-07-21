import { useCallback, useEffect, useRef, useState } from 'react'
import { studioControllerListAssignments } from '~/api/operations/studio/studio'
import type { AssignmentListResDtoOutputItemsItem } from '~/api/model/studio'
import type { StudioControllerListAssignmentsParams } from '~/api/model/studio'
import { StudioControllerListAssignmentsActiveNow } from '~/api/model/studio'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import type { SeriesControllerListSeriesParams } from '~/api/model/series'
import { chapterControllerListBySeries } from '~/api/operations/chapters/chapters'
import type { ChapterControllerListBySeriesParams } from '~/api/model/chapters'
import { chapterControllerListPages } from '~/api/operations/chapters/chapters'
import type { ChapterControllerListPagesPathParameters } from '~/api/model/chapters'
import { taskControllerListRegions } from '~/api/operations/task/task'
import type { TaskControllerListRegionsPathParameters } from '~/api/model/task'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

// ─── Data types ─────────────────────────────────────────────────────────────

export type ActiveAssignmentOption = AssignmentListResDtoOutputItemsItem

export type SeriesOption = {
  id: string
  title: string
}

export type ChapterOption = {
  id: string
  seriesId: string
  chapterNumber: number
  title?: string
}

export type PageOption = {
  id: string
  chapterId: string
  pageNumber: number
  /** Original R2 key (pencil/ink) — nullable per `PageResDtoOutput.originalFile`. */
  originalFile: string | null
  /** Composite R2 key — nullable per `PageResDtoOutput.compositeFile`. */
  compositeFile: string | null
}

export type RegionOption = {
  id: string
  pageId: string
  label: string
}

// ─── State types ─────────────────────────────────────────────────────────────

export type TaskComposerData = {
  assignments: ActiveAssignmentOption[]
  series: SeriesOption[]
  chapters: ChapterOption[]
  pages: PageOption[]
  regions: RegionOption[]
  loading: {
    assignments: boolean
    series: boolean
    chapters: boolean
    pages: boolean
    regions: boolean
  }
  errors: Partial<Record<'assignments' | 'series' | 'chapters' | 'pages' | 'regions', string>>
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export interface UseTaskComposerDataOptions {
  /** Pre-select studio-assignment id (StudioAssignment.id). */
  presetAssignmentId?: string
  /** Pre-select series */
  presetSeriesId?: string
  /** Pre-select chapter */
  presetChapterId?: string
  /** Pre-select page */
  presetPageId?: string
  /** Pre-select region */
  presetRegionId?: string
}

/**
 * Return type of `useTaskComposerData`.
 *
 * Components rendered inside the SAME composer dialog MUST share a single
 * instance via this return value (passed as a prop). Calling the hook from
 * sibling components breaks the cascading chapter→page→region fetch because
 * each instance has its own state closure.
 */
export interface UseTaskComposerDataResult {
  data: TaskComposerData
  selected: {
    assignmentId?: string
    seriesId?: string
    chapterId?: string
    pageId?: string
    regionId?: string
  }
  setAssignment: (id: string | undefined) => void
  setSeries: (id: string | undefined) => void
  setChapter: (id: string | undefined) => void
  setPage: (id: string | undefined) => void
  setRegion: (id: string | undefined) => void
  reload: (scope: 'assignments' | 'series' | 'chapters' | 'pages' | 'regions') => void
}

/**
 * Loads the cascading data needed by the "Assign task" composer:
 * active studio assignments → series → chapters → pages → regions.
 *
 * NOTE on preset semantics:
 *  - We no longer use a brittle `setTimeout(100ms)` to apply presets. Instead
 *    presets are applied immediately, and downstream fetches kick off as soon
 *    as the parent selection is set. The UI shows skeletons until each
 *    dropdown's data arrives.
 *  - The composer dialog must call `setChapter`/`setPage`/etc. with the
 *    preset ids once it has the data (we expose `applyPreset` to do that in
 *    one shot).
 */
export function useTaskComposerData(options: UseTaskComposerDataOptions = {}): UseTaskComposerDataResult {
  const [data, setData] = useState<TaskComposerData>({
    assignments: [],
    series: [],
    chapters: [],
    pages: [],
    regions: [],
    loading: {
      assignments: true,
      series: true,
      chapters: false,
      pages: false,
      regions: false
    },
    errors: {}
  })

  // Selected values
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | undefined>(options.presetAssignmentId)
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | undefined>(options.presetSeriesId)
  const [selectedChapterId, setSelectedChapterId] = useState<string | undefined>(options.presetChapterId)
  const [selectedPageId, setSelectedPageId] = useState<string | undefined>(options.presetPageId)
  const [selectedRegionId, setSelectedRegionId] = useState<string | undefined>(options.presetRegionId)

  // Abort controllers
  const chaptersAbortRef = useRef<AbortController | null>(null)
  const pagesAbortRef = useRef<AbortController | null>(null)
  const regionsAbortRef = useRef<AbortController | null>(null)

  // ── Fetch assignments (always) ──────────────────────────────────────
  const fetchAssignments = useCallback(async () => {
    try {
      setData((prev) => ({ ...prev, loading: { ...prev.loading, assignments: true } }))
      const res = await studioControllerListAssignments({
        activeNow: StudioControllerListAssignmentsActiveNow.true
      } satisfies StudioControllerListAssignmentsParams)
      const items = (res.data as { items: AssignmentListResDtoOutputItemsItem[] }).items ?? []
      setData((prev) => ({
        ...prev,
        assignments: items,
        loading: { ...prev.loading, assignments: false },
        errors: { ...prev.errors, assignments: undefined }
      }))
    } catch (err) {
      setData((prev) => ({
        ...prev,
        loading: { ...prev.loading, assignments: false },
        errors: { ...prev.errors, assignments: extractApiErrorMessage(err, 'Không tải được danh sách thuê') }
      }))
    }
  }, [])

  // ── Fetch series (always) ────────────────────────────────────────────
  const fetchSeries = useCallback(async () => {
    try {
      setData((prev) => ({ ...prev, loading: { ...prev.loading, series: true } }))
      const res = await seriesControllerListSeries({ limit: 100 } satisfies SeriesControllerListSeriesParams)
      const items = (res.data as { items: Array<{ id: string; title: string }> }).items ?? []
      setData((prev) => ({
        ...prev,
        series: items.map((s) => ({ id: s.id, title: s.title })),
        loading: { ...prev.loading, series: false },
        errors: { ...prev.errors, series: undefined }
      }))
    } catch (err) {
      setData((prev) => ({
        ...prev,
        loading: { ...prev.loading, series: false },
        errors: { ...prev.errors, series: extractApiErrorMessage(err, 'Không tải được danh sách series') }
      }))
    }
  }, [])

  // ── Fetch chapters when series changes ───────────────────────────────
  const fetchChapters = useCallback(async (seriesId: string) => {
    chaptersAbortRef.current?.abort()
    const ctrl = new AbortController()
    chaptersAbortRef.current = ctrl
    try {
      setData((prev) => ({
        ...prev,
        loading: { ...prev.loading, chapters: true },
        chapters: [],
        pages: [],
        regions: []
      }))
      const res = await chapterControllerListBySeries({ seriesId } satisfies ChapterControllerListBySeriesParams, {
        signal: ctrl.signal
      })
      const items =
        (res.data as { items: Array<{ id: string; seriesId: string; chapterNumber: number; title?: string }> }).items ??
        []
      setData((prev) => ({
        ...prev,
        chapters: items.map((c) => ({
          id: c.id,
          seriesId: c.seriesId,
          chapterNumber: c.chapterNumber,
          title: c.title
        })),
        loading: { ...prev.loading, chapters: false },
        errors: { ...prev.errors, chapters: undefined }
      }))
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setData((prev) => ({
          ...prev,
          loading: { ...prev.loading, chapters: false },
          errors: { ...prev.errors, chapters: extractApiErrorMessage(err, 'Không tải được danh sách chương') }
        }))
      }
    }
  }, [])

  // ── Fetch pages when chapter changes ─────────────────────────────────
  const fetchPages = useCallback(async (chapterId: string) => {
    pagesAbortRef.current?.abort()
    const ctrl = new AbortController()
    pagesAbortRef.current = ctrl
    try {
      setData((prev) => ({ ...prev, loading: { ...prev.loading, pages: true }, pages: [], regions: [] }))
      const res = await chapterControllerListPages(
        { id: chapterId } satisfies ChapterControllerListPagesPathParameters,
        { signal: ctrl.signal }
      )
      const items = (res.data as { items: Array<{ id: string; chapterId: string; pageNumber: number; originalFile: string | null; compositeFile: string | null }> }).items ?? []
      setData((prev) => ({
        ...prev,
        pages: items.map((p) => ({
          id: p.id,
          chapterId: p.chapterId,
          pageNumber: p.pageNumber,
          originalFile: p.originalFile,
          compositeFile: p.compositeFile
        })),
        loading: { ...prev.loading, pages: false },
        errors: { ...prev.errors, pages: undefined }
      }))
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setData((prev) => ({
          ...prev,
          loading: { ...prev.loading, pages: false },
          errors: { ...prev.errors, pages: extractApiErrorMessage(err, 'Không tải được danh sách trang') }
        }))
      }
    }
  }, [])

  // ── Fetch regions when page changes ────────────────────────────────
  const fetchRegions = useCallback(async (pageId: string) => {
    regionsAbortRef.current?.abort()
    const ctrl = new AbortController()
    regionsAbortRef.current = ctrl
    try {
      setData((prev) => ({ ...prev, loading: { ...prev.loading, regions: true }, regions: [] }))
      const res = await taskControllerListRegions({ id: pageId } satisfies TaskControllerListRegionsPathParameters, {
        signal: ctrl.signal
      })
      const items = (res.data as { items: Array<{ id: string; pageId: string }> }).items ?? []
      setData((prev) => ({
        ...prev,
        regions: items.map((r, i) => ({ id: r.id, pageId: r.pageId, label: `Region ${i + 1}` })),
        loading: { ...prev.loading, regions: false },
        errors: { ...prev.errors, regions: undefined }
      }))
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setData((prev) => ({
          ...prev,
          loading: { ...prev.loading, regions: false },
          errors: { ...prev.errors, regions: extractApiErrorMessage(err, 'Không tải được danh sách vùng') }
        }))
      }
    }
  }, [])

  // ── Initial load ─────────────────────────────────────────────────────
  useEffect(() => {
    void fetchAssignments()
    void fetchSeries()
  }, [fetchAssignments, fetchSeries])

  // ── Cascade: when series changes, reset & fetch chapters ────────────
  useEffect(() => {
    if (selectedSeriesId) {
      void fetchChapters(selectedSeriesId)
    } else {
      setData((prev) => ({ ...prev, chapters: [], pages: [], regions: [] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeriesId])

  // ── Cascade: when chapter changes, reset & fetch pages ──────────────
  useEffect(() => {
    if (selectedChapterId) {
      void fetchPages(selectedChapterId)
    } else {
      setData((prev) => ({ ...prev, pages: [], regions: [] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChapterId])

  // ── Cascade: when page changes, reset & fetch regions ───────────────
  useEffect(() => {
    if (selectedPageId) {
      void fetchRegions(selectedPageId)
    } else {
      setData((prev) => ({ ...prev, regions: [] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPageId])

  // ── Apply presets via cascading fetches ──────────────────────────────
  // The previous version used a 100ms setTimeout that broke when chapters/pages
  // hadn't been fetched yet (no `seriesId` set initially). Now we trigger the
  // chain directly: assignments + series load on mount, then we kick off
  // chapter/page/region fetches as soon as the corresponding preset id is set.
  // The pickers disable their selects until the data is loaded, which is the
  // correct UX (no more "lucky path" assumptions).
  useEffect(() => {
    if (options.presetChapterId && !selectedChapterId) {
      setSelectedChapterId(options.presetChapterId)
    }
    if (options.presetPageId && !selectedPageId) {
      setSelectedPageId(options.presetPageId)
    }
    if (options.presetRegionId && !selectedRegionId) {
      setSelectedRegionId(options.presetRegionId)
    }
    // We only run this once on mount (no deps for the "set once" semantics).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Reload helpers ───────────────────────────────────────────────────
  const reload = useCallback(
    (scope: 'assignments' | 'series' | 'chapters' | 'pages' | 'regions') => {
      switch (scope) {
        case 'assignments':
          void fetchAssignments()
          break
        case 'series':
          void fetchSeries()
          break
        case 'chapters':
          if (selectedSeriesId) void fetchChapters(selectedSeriesId)
          break
        case 'pages':
          if (selectedChapterId) void fetchPages(selectedChapterId)
          break
        case 'regions':
          if (selectedPageId) void fetchRegions(selectedPageId)
          break
      }
    },
    [
      fetchAssignments,
      fetchSeries,
      fetchChapters,
      fetchPages,
      fetchRegions,
      selectedSeriesId,
      selectedChapterId,
      selectedPageId
    ]
  )

  // ── Setters with cascade reset ────────────────────────────────────────
  const setAssignment = useCallback((id: string | undefined) => {
    setSelectedAssignmentId(id)
    setSelectedSeriesId(undefined)
    setSelectedChapterId(undefined)
    setSelectedPageId(undefined)
    setSelectedRegionId(undefined)
  }, [])

  const setSeries = useCallback((id: string | undefined) => {
    setSelectedSeriesId(id)
    setSelectedChapterId(undefined)
    setSelectedPageId(undefined)
    setSelectedRegionId(undefined)
  }, [])

  const setChapter = useCallback((id: string | undefined) => {
    setSelectedChapterId(id)
    setSelectedPageId(undefined)
    setSelectedRegionId(undefined)
  }, [])

  const setPage = useCallback((id: string | undefined) => {
    setSelectedPageId(id)
    setSelectedRegionId(undefined)
  }, [])

  const setRegion = useCallback((id: string | undefined) => {
    setSelectedRegionId(id)
  }, [])

  return {
    data,
    selected: {
      assignmentId: selectedAssignmentId,
      seriesId: selectedSeriesId,
      chapterId: selectedChapterId,
      pageId: selectedPageId,
      regionId: selectedRegionId
    },
    setAssignment,
    setSeries,
    setChapter,
    setPage,
    setRegion,
    reload
  }
}
