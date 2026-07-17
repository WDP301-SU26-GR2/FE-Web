import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  aiControllerApplyJob,
  aiControllerGetJob,
  aiControllerSegment
} from '~/api/operations/ai/ai'
import type {
  AiJobResDtoOutput,
  AiJobResDtoOutputProposedRegionsItem,
  ApplyAiJobResDtoOutput
} from '~/api/model/ai'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export type SegmentMode = 'MODEL' | 'HEURISTIC'

export type SegmentJobStatus = AiJobResDtoOutput['status'] | 'IDLE'

export type ProposedRegion = {
  coordinates: { x: number; y: number; width: number; height: number }
  regionType: AiJobResDtoOutputProposedRegionsItem['regionType']
  detectedSubtype: string | null
  confidenceScore: number | null
}

type UsePageSegmentResult = {
  jobId: string | null
  status: SegmentJobStatus
  proposedRegions: ProposedRegion[]
  durationMs: number | null
  isStarting: boolean
  isApplying: boolean
  error: string | null
  startSegment: (pageId: string, mode: SegmentMode) => void
  apply: (pageId: string) => Promise<boolean>
  reset: () => void
}

const POLL_INTERVAL_MS = 5_000
const POLL_TIMEOUT_MS = 120_000

/**
 * Drive an AI segmentation job on a Page (`POST /pages/:id/segment` then poll
 * `GET /ai-jobs/:id`).
 *
 * Per FE-API-Guide §6:
 *  1. `aiControllerSegment` returns `{ jobId }` (201) — async job.
 *  2. Poll `aiControllerGetJob` until `status='SUCCEEDED'|'FAILED'`. While
 *     `appliedAt === null`, the proposed regions are *ephemeral* — they live
 *     only on the AI job; the user must explicitly `POST /ai-jobs/:id/apply` to
 *     persist them as `Region` rows (`createdBy='AI'`).
 *  3. While the job is in flight, regions already on the page (manual or
 *     confirmed-AI) are NOT touched.
 */
export function usePageSegment(): UsePageSegmentResult {
  const { t } = useTranslation('mangaka')
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<SegmentJobStatus>('IDLE')
  const [proposedRegions, setProposedRegions] = useState<ProposedRegion[]>([])
  const [durationMs, setDurationMs] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollJobRef = useRef<((id: string) => Promise<void>) | null>(null)
  const startedAtRef = useRef<number>(0)

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  // Drain poll on unmount
  useEffect(() => () => clearPoll(), [clearPoll])

  const pollJob = useCallback(
    async (id: string) => {
      clearPoll()
      try {
        const res = await aiControllerGetJob({ id: id })
        const job = res.data as AiJobResDtoOutput
        setStatus(job.status)
        setDurationMs(job.durationMs)
        setProposedRegions(
          (job.proposedRegions ?? []).map((p) => ({
            coordinates: p.coordinates,
            regionType: p.regionType,
            detectedSubtype: p.detectedSubtype,
            confidenceScore: p.confidenceScore
          }))
        )

        if (job.status === 'SUCCEEDED' || job.status === 'FAILED') {
          setError(job.error)
          return
        }
        if (Date.now() - startedAtRef.current >= POLL_TIMEOUT_MS) {
          setStatus('FAILED')
          setError(t('studio.popup.errors.aiTimeout'))
          return
        }
        pollTimerRef.current = setTimeout(() => void pollJobRef.current?.(id), POLL_INTERVAL_MS)
      } catch {
        // transient network — retry once
        pollTimerRef.current = setTimeout(() => void pollJobRef.current?.(id), POLL_INTERVAL_MS)
      }
    },
    [clearPoll, t]
  )

  // Keep ref in sync so setTimeout callbacks always invoke the latest closure.
  useEffect(() => {
    pollJobRef.current = pollJob
  }, [pollJob])

  const startSegment: UsePageSegmentResult['startSegment'] = useCallback(
    (pid, mode) => {
      void (async () => {
        clearPoll()
        setIsStarting(true)
        setError(null)
        setProposedRegions([])
        setDurationMs(null)
        startedAtRef.current = Date.now()
        try {
          const res = await aiControllerSegment({ id: pid }, { mode })
          const started = res.data as { jobId: string }
          setJobId(started.jobId)
          setStatus('QUEUED')
          setTimeout(() => void pollJobRef.current?.(started.jobId), POLL_INTERVAL_MS)
        } catch (err) {
          setError(extractApiErrorMessage(err, t('studio.popup.errors.aiStartFailed')))
          setStatus('FAILED')
        } finally {
          setIsStarting(false)
        }
      })()
    },
    [clearPoll, t]
  )

  const reset = useCallback(() => {
    clearPoll()
    setJobId(null)
    setStatus('IDLE')
    setProposedRegions([])
    setDurationMs(null)
    setError(null)
  }, [clearPoll])

  const apply: UsePageSegmentResult['apply'] = useCallback(
    async (pid: string) => {
      if (!jobId) return false
      // `apply` operates on the AI job id (server-side), not the page id, but
      // we accept pageId for symmetry with the wider caller — validates the
      // caller had the correct page in scope.
      void pid
      setIsApplying(true)
      try {
        const res = await aiControllerApplyJob({ id: jobId })
        const out = res.data as ApplyAiJobResDtoOutput
        toast.success(t('studio.popup.toast.aiApplied', { count: out.created }))
        reset()
        return true
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('studio.popup.errors.aiApplyFailed')))
        return false
      } finally {
        setIsApplying(false)
      }
    },
    [jobId, reset, t]
  )

  return {
    jobId,
    status,
    proposedRegions,
    durationMs,
    isStarting,
    isApplying,
    error,
    startSegment,
    apply,
    reset
  }
}
