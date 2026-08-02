import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FilePlus2,
  Loader2,
  Upload,
  Vote,
  X
} from 'lucide-react'
import type { BoardVoteResDtoOutput, SeriesReportResDtoOutput } from '~/api/model/board'
import type { BoardMeetingDecision, BoardSessionPhase } from '~/api/manual/board-meeting'
import type { DefenseDashboardResDtoOutput } from '~/api/model/tankobon'
import { useAuth } from '~/features/auth/context/auth-context'
import {
  boardInput,
  BoardFeedback,
  BoardHeader,
  BoardPanel,
  StatusBadge,
  useBoardPolling
} from '../components/board-ui'
import type { BoardActionResult } from '../types'
import { useSessionVoteProgress } from '../sessions/use-session-vote-progress'
import { SeriesMeetingBrief, type BoardMeetingSeriesBrief } from '../sessions/components/series-meeting-brief'
import { Dialog } from '~/shared/ui/dialog'
import { cn } from '~/shared/lib/cn'
import { uploadToR2WithMessage } from '~/shared/lib/upload/upload-to-r2'
import { storageControllerSignDownload } from '~/api/operations/uploads/uploads'

export function BoardDecisionDetailPage({
  decision,
  votes,
  reports,
  seriesBrief,
  defense,
  sessionStatus,
  sessionPhase,
  sessionTitle,
  allowedEditorIds,
  canCreateReport = false,
  lifecycleHref,
  resourceHref,
  readOnly = false,
  backPath
}: {
  decision: BoardMeetingDecision
  votes: BoardVoteResDtoOutput[]
  reports: SeriesReportResDtoOutput[]
  seriesBrief: BoardMeetingSeriesBrief | null
  defense: DefenseDashboardResDtoOutput | null
  sessionStatus: string
  sessionPhase: BoardSessionPhase
  sessionTitle: string
  allowedEditorIds: string[]
  canCreateReport?: boolean
  lifecycleHref?: string
  resourceHref?: string
  readOnly?: boolean
  backPath?: string
}) {
  const { t } = useTranslation('board')
  const { session: authSession } = useAuth()
  const [voteOpen, setVoteOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  useBoardPolling()
  const meeting = useSessionVoteProgress({
    sessionId: decision.boardSessionId,
    decisions: [decision],
    initialPhase: sessionPhase,
    initialMessages: []
  })
  const liveDecision = meeting.decisions.find((item) => item.id === decision.id) ?? decision
  const livePhase = meeting.phase
  const currentUserId = authSession?.user.id ?? ''
  const voterAllowed = allowedEditorIds.includes(currentUserId)
  const alreadyVoted = votes.some((vote) => vote.voterId === currentUserId)
  const decisionOpen = liveDecision.result === 'PENDING' || liveDecision.result === 'PENDING_QUORUM'
  const canVote =
    !readOnly && sessionStatus === 'ACTIVE' && livePhase === 'VOTING' && decisionOpen && voterAllowed && !alreadyVoted
  const seriesTitle = decision.targetSeries?.title ?? t('decisions.unknownSeries')
  const typeLabel = decision.decisionType
    ? t(`filters.decisionTypes.${decision.decisionType}`, { defaultValue: t('common.notAvailable') })
    : t('decisions.title')
  const displayTitle =
    decision.decisionType === 'SERIALIZATION'
      ? t('decisions.serializationTitle', { series: seriesTitle })
      : t('decisions.genericTitle', { type: typeLabel, series: seriesTitle })
  const lifecycleFollowUpKey =
    liveDecision.decisionType === 'COMPLETION'
      ? 'completion'
      : liveDecision.decisionType === 'CANCELLATION'
        ? 'cancellation'
        : null
  const requiresLifecycleFollowUp = lifecycleHref && liveDecision.result === 'APPROVED' && lifecycleFollowUpKey

  const voteUnavailableReason = readOnly
    ? ''
    : !decisionOpen
      ? t('decisions.voteUnavailable.closed')
      : alreadyVoted
        ? t('decisions.voteUnavailable.alreadyVoted')
        : !voterAllowed
          ? t('decisions.voteUnavailable.notInRoster')
          : sessionStatus !== 'ACTIVE'
            ? t('decisions.voteUnavailable.sessionNotActive')
            : livePhase !== 'VOTING'
              ? t('decisions.voteUnavailable.votingNotOpen')
              : ''
  return (
    <div className='space-y-6 pb-12'>
      {backPath && (
        <Link to={backPath} className='inline-flex items-center gap-2 text-xs font-bold text-primary'>
          <ArrowLeft className='size-4' />
          {t('common.back')}
        </Link>
      )}
      <BoardHeader
        title={displayTitle}
        description={`${typeLabel} · ${t('decisions.sessionLabel')}: ${sessionTitle}`}
      />
      {seriesBrief && (
        <BoardPanel title={t('sessions.seriesBrief.title')}>
          <SeriesMeetingBrief brief={seriesBrief} />
        </BoardPanel>
      )}
      {decision.details && Object.keys(decision.details).length > 0 && <DecisionDetails details={decision.details} />}
      {defense && <DefenseEvidence defense={defense} />}
      <BoardPanel title={t('decisions.progress')}>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <StatusBadge value={liveDecision.result ?? 'PENDING'} />
          <strong>
            {t('decisions.summary', {
              approve: liveDecision.approveCount,
              reject: liveDecision.rejectCount,
              total: liveDecision.totalVotes
            })}
          </strong>
        </div>
        <div className='mt-4 h-2 overflow-hidden rounded-full bg-muted'>
          <div
            className='h-full rounded-full bg-primary transition-[width] duration-300'
            style={{
              width: `${allowedEditorIds.length ? Math.min((liveDecision.totalVotes / allowedEditorIds.length) * 100, 100) : 0}%`
            }}
          />
        </div>
      </BoardPanel>
      {requiresLifecycleFollowUp && (
        <BoardPanel title={t('decisions.lifecycleFollowUp.title')}>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <p className='max-w-3xl text-xs leading-5 text-muted-foreground'>
              {t(`decisions.lifecycleFollowUp.${lifecycleFollowUpKey}`)}
            </p>
            <Link
              to={lifecycleHref}
              className='inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground'
            >
              {t('decisions.lifecycleFollowUp.action')}
              <ArrowRight className='size-4' />
            </Link>
          </div>
        </BoardPanel>
      )}
      {resourceHref && liveDecision.decisionType === 'CONTRACT' && (
        <BoardPanel title={t('decisions.contractFollowUp.title')}>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <p className='text-xs leading-5 text-muted-foreground'>
              {t(`decisions.contractFollowUp.${liveDecision.result ?? 'PENDING'}`)}
            </p>
            <Link
              to={resourceHref}
              className='inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground'
            >
              {t(
                ['APPROVED', 'REJECTED'].includes(liveDecision.result ?? '')
                  ? 'decisions.contractFollowUp.apply'
                  : 'decisions.contractFollowUp.open'
              )}
              <ArrowRight className='size-4' />
            </Link>
          </div>
        </BoardPanel>
      )}
      {canVote && (
        <button
          type='button'
          onClick={() => setVoteOpen(true)}
          className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground'
        >
          <Vote className='h-4 w-4' />
          {t('decisions.castVote')}
        </button>
      )}
      {voteOpen && <VoteDialog onClose={() => setVoteOpen(false)} />}
      {!canVote && voteUnavailableReason && (
        <p className='rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground'>
          {voteUnavailableReason}
        </p>
      )}
      {!decisionOpen && sessionStatus === 'ACTIVE' && (
        <p className='rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground'>
          {t('decisions.finalizedSessionHint', { phase: t(`filters.sessionPhases.${livePhase}`) })}
        </p>
      )}
      <div className='space-y-5'>
        <BoardPanel title={t('reports.title')}>
          <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
            <p className='text-xs text-muted-foreground'>{t('reports.description')}</p>
            {canCreateReport && sessionStatus !== 'CONCLUDED' && decision.targetSeriesId && (
              <button
                type='button'
                onClick={() => setReportOpen(true)}
                className='inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground'
              >
                <FilePlus2 className='size-4' />
                {t('reports.add')}
              </button>
            )}
          </div>
          <div className='space-y-3'>
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
            {!reports.length && <p className='text-xs text-muted-foreground'>{t('reports.empty')}</p>}
          </div>
        </BoardPanel>
        <BoardPanel title={t('decisions.votes')}>
          <div className='space-y-2'>
            {votes.map((vote, index) => (
              <div
                key={`${vote.voterId ?? 'vote'}-${index}`}
                className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-xs'
              >
                <span>{vote.voterId}</span>
                <StatusBadge value={vote.voteValue ?? 'ABSTAIN'} />
              </div>
            ))}
            {!votes.length && <p className='text-xs text-muted-foreground'>{t('decisions.emptyVotes')}</p>}
          </div>
        </BoardPanel>
      </div>
      {reportOpen && (
        <CreateReportDialog
          onClose={() => setReportOpen(false)}
          series={seriesBrief?.series ?? null}
          defense={defense}
        />
      )}
    </div>
  )
}

function DefenseEvidence({ defense }: { defense: DefenseDashboardResDtoOutput }) {
  const { t } = useTranslation('board')
  const latest = defense.rankingTrend.at(-1)
  return (
    <BoardPanel title={t('reports.evidenceTitle')}>
      <dl className='grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4'>
        <DecisionFact label={t('reports.chaptersPublished')} value={String(defense.serialization.chaptersPublished)} />
        <DecisionFact label={t('reports.unitsSold')} value={String(defense.tankobon.totalUnitsSold)} />
        <DecisionFact label={t('reports.latestRank')} value={latest?.rankPosition ? `#${latest.rankPosition}` : '—'} />
        <DecisionFact label={t('reports.riskLevel')} value={latest?.riskLevel ?? '—'} />
      </dl>
    </BoardPanel>
  )
}

function DecisionDetails({ details }: { details: Record<string, unknown> }) {
  const { t } = useTranslation('board')
  return (
    <BoardPanel title={t('decisions.details')}>
      <dl className='grid gap-3 text-xs sm:grid-cols-2'>
        {Object.entries(details).map(([key, value]) => (
          <DecisionFact
            key={key}
            label={t(`decisions.detailFields.${key}`, { defaultValue: t('common.data') })}
            value={formatDetailValue(value, t('common.yes'), t('common.no'))}
          />
        ))}
      </dl>
    </BoardPanel>
  )
}

function ReportCard({ report }: { report: SeriesReportResDtoOutput }) {
  const { t, i18n } = useTranslation('board')
  return (
    <article className='rounded-lg border border-border p-3'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <strong>
          {report.reportType
            ? t(`reports.types.${report.reportType}`, {
                defaultValue: t('common.notAvailable')
              })
            : t('reports.title')}
        </strong>
        <time className='text-xs text-muted-foreground'>{formatDate(report.createdAt, i18n.language)}</time>
      </div>
      {report.content && <p className='mt-2 whitespace-pre-wrap text-xs text-muted-foreground'>{report.content}</p>}
      {report.attachments.length > 0 && (
        <ul className='mt-3 space-y-1 border-t border-border pt-3 text-xs'>
          {report.attachments.map((attachment) => (
            <li key={attachment}>
              <ReportAttachmentLink attachment={attachment} />
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function ReportAttachmentLink({ attachment }: { attachment: string }) {
  const { t } = useTranslation('board')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const directUrl = /^https?:\/\//i.test(attachment)

  async function openAttachment() {
    setError(false)
    if (directUrl) {
      window.open(attachment, '_blank', 'noopener,noreferrer')
      return
    }
    const target = window.open('about:blank', '_blank')
    if (target) target.opener = null
    setLoading(true)
    try {
      const response = await storageControllerSignDownload({ key: attachment })
      if (target) target.location.href = response.data.downloadUrl
      else {
        const link = document.createElement('a')
        link.href = response.data.downloadUrl
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        document.body.appendChild(link)
        link.click()
        link.remove()
      }
    } catch {
      target?.close()
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type='button'
        onClick={() => void openAttachment()}
        disabled={loading}
        className='inline-flex max-w-full items-center gap-2 text-left font-semibold text-primary hover:underline disabled:opacity-60'
      >
        {loading ? <Loader2 className='size-3.5 shrink-0 animate-spin' /> : <Download className='size-3.5 shrink-0' />}
        <span className='truncate'>{attachmentFileName(attachment)}</span>
      </button>
      {error && <p className='mt-1 text-xs text-destructive'>{t('reports.attachmentErrors.downloadFailed')}</p>}
    </div>
  )
}

function attachmentFileName(value: string) {
  try {
    const segment = decodeURIComponent(value.split('/').at(-1) || value)
    return segment.replace(/^[0-9a-f]{8}-[0-9a-f-]{27}-/i, '') || segment
  } catch {
    return value
  }
}

function DecisionFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className='text-xs text-muted-foreground'>{label}</dt>
      <dd className='mt-1 font-bold text-foreground'>{value}</dd>
    </div>
  )
}

function CreateReportDialog({
  onClose,
  series,
  defense
}: {
  onClose: () => void
  series: BoardMeetingSeriesBrief['series'] | null
  defense: DefenseDashboardResDtoOutput | null
}) {
  const { t, i18n } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()
  const [attachments, setAttachments] = useState<string[]>([])
  const [attachmentsUploading, setAttachmentsUploading] = useState(false)
  const latestRanking = defense?.rankingTrend.at(-1)
  const evidenceOptions = [
    {
      value: 'LIFECYCLE',
      label: t('reports.evidenceOptions.lifecycle'),
      description: t('reports.evidenceOptions.lifecycleDescription'),
      summary: series?.status ?? '—',
      available: Boolean(series)
    },
    {
      value: 'SERIALIZATION',
      label: t('reports.evidenceOptions.serialization'),
      description: t('reports.evidenceOptions.serializationDescription'),
      summary: defense ? t('reports.chapterCount', { count: defense.serialization.chaptersPublished }) : '—',
      available: Boolean(defense)
    },
    {
      value: 'SALES',
      label: t('reports.evidenceOptions.sales'),
      description: t('reports.evidenceOptions.salesDescription'),
      summary: defense ? t('reports.unitCount', { count: defense.tankobon.totalUnitsSold }) : '—',
      available: Boolean(defense)
    },
    {
      value: 'RANKING',
      label: t('reports.evidenceOptions.ranking'),
      description: t('reports.evidenceOptions.rankingDescription'),
      summary: latestRanking
        ? `${latestRanking.rankPosition ? `#${latestRanking.rankPosition}` : '—'} · ${latestRanking.riskLevel}`
        : '—',
      available: Boolean(latestRanking)
    }
  ]

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) onClose()
  }, [fetcher.data, fetcher.state, onClose])

  return (
    <Dialog
      compact
      open
      onClose={onClose}
      titleId='create-decision-report-title'
      title={t('reports.createTitle')}
      description={t('reports.createDescription')}
      size='lg'
    >
      <fetcher.Form method='post' className='grid gap-3'>
        <input type='hidden' name='intent' value='createReport' />
        <input type='hidden' name='reportLocale' value={i18n.language === 'en' ? 'en' : 'vi'} />
        <label className='grid gap-1.5 text-xs font-semibold'>
          {t('reports.reportType')}
          <select className={boardInput} name='reportType' required defaultValue='DEFENSE'>
            <option value='DEFENSE'>{t('reports.types.DEFENSE')}</option>
            <option value='PERFORMANCE'>{t('reports.types.PERFORMANCE')}</option>
            <option value='LIFECYCLE'>{t('reports.types.LIFECYCLE')}</option>
          </select>
        </label>
        <fieldset className='grid gap-2'>
          <legend className='text-xs font-semibold'>{t('reports.selectEvidence')}</legend>
          <p className='text-xs font-normal text-muted-foreground'>{t('reports.selectEvidenceHint')}</p>
          <div className='grid gap-2 sm:grid-cols-2'>
            {evidenceOptions.map((option) => (
              <label
                key={option.value}
                className={`flex gap-3 rounded-lg border p-3 text-xs ${
                  option.available
                    ? 'cursor-pointer border-border bg-background hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5'
                    : 'cursor-not-allowed border-border/60 bg-muted/40 opacity-60'
                }`}
              >
                <input
                  type='checkbox'
                  name='evidenceSections'
                  value={option.value}
                  disabled={!option.available}
                  className='mt-0.5 size-4 accent-primary'
                />
                <span className='min-w-0'>
                  <span className='flex items-center justify-between gap-2 font-bold'>
                    <span>{option.label}</span>
                    <span className='shrink-0 text-primary'>{option.summary}</span>
                  </span>
                  <span className='mt-1 block font-normal leading-5 text-muted-foreground'>{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className='grid gap-1.5 text-xs font-semibold'>
          {t('reports.optionalAnalysis')}
          <textarea
            className={`${boardInput} min-h-28 py-2`}
            name='content'
            maxLength={3000}
            placeholder={t('reports.optionalAnalysisHint')}
          />
        </label>
        <div className='grid gap-1.5 text-xs font-semibold'>
          <span>{t('reports.attachments')}</span>
          <ReportAttachmentUploader onKeysChange={setAttachments} onUploadingChange={setAttachmentsUploading} />
          <input type='hidden' name='attachments' value={attachments.join('\n')} />
        </div>
        <div className='flex justify-end gap-2 border-t border-border pt-4'>
          <button
            type='button'
            onClick={onClose}
            className='h-10 rounded-md border border-border px-4 text-xs font-bold'
          >
            {t('common.cancel')}
          </button>
          <button
            disabled={fetcher.state !== 'idle' || attachmentsUploading}
            className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50'
          >
            {fetcher.state !== 'idle' || attachmentsUploading ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <FilePlus2 className='size-4' />
            )}
            {attachmentsUploading ? t('reports.uploadingAttachments') : t('reports.submit')}
          </button>
        </div>
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </Dialog>
  )
}

type ReportUploadEntry = {
  id: string
  file: File
  status: 'uploading' | 'done' | 'error'
  key?: string
  error?: string
}

const REPORT_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']

function ReportAttachmentUploader({
  onKeysChange,
  onUploadingChange
}: {
  onKeysChange: (keys: string[]) => void
  onUploadingChange: (uploading: boolean) => void
}) {
  const { t } = useTranslation('board')
  const inputRef = useRef<HTMLInputElement>(null)
  const [entries, setEntries] = useState<ReportUploadEntry[]>([])
  const [dragging, setDragging] = useState(false)

  const commitEntries = useCallback(
    (update: (current: ReportUploadEntry[]) => ReportUploadEntry[]) => {
      setEntries((current) => {
        const next = update(current)
        onKeysChange(next.flatMap((entry) => (entry.status === 'done' && entry.key ? [entry.key] : [])))
        onUploadingChange(next.some((entry) => entry.status === 'uploading'))
        return next
      })
    },
    [onKeysChange, onUploadingChange]
  )

  const addFiles = useCallback(
    async (files: File[]) => {
      const newEntries = files.map<ReportUploadEntry>((file) => {
        const invalidType = !REPORT_FILE_TYPES.includes(file.type)
        return {
          id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
          file,
          status: invalidType ? 'error' : 'uploading',
          error: invalidType ? t('reports.attachmentErrors.invalidType') : undefined
        }
      })
      commitEntries((current) => [...current, ...newEntries])

      await Promise.all(
        newEntries
          .filter((entry) => entry.status === 'uploading')
          .map(async (entry) => {
            const result = await uploadToR2WithMessage(entry.file, t('reports.attachmentErrors.uploadFailed'), 'OTHER')
            commitEntries((current) =>
              current.map((item) =>
                item.id === entry.id
                  ? result.key
                    ? { ...item, status: 'done', key: result.key, error: undefined }
                    : { ...item, status: 'error', error: result.error }
                  : item
              )
            )
          })
      )
    },
    [commitEntries, t]
  )

  const selectFiles = (files: FileList | null) => {
    if (files?.length) void addFiles(Array.from(files))
  }

  return (
    <div className='space-y-2'>
      <div
        role='button'
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          selectFiles(event.dataTransfer.files)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/20 hover:border-primary/50'
        )}
      >
        <Upload className='size-6 text-primary' />
        <span className='font-bold text-foreground'>{t('reports.attachmentDropzone')}</span>
        <span className='font-normal text-muted-foreground'>{t('reports.attachmentFormats')}</span>
      </div>
      <input
        ref={inputRef}
        type='file'
        accept={REPORT_FILE_TYPES.join(',')}
        multiple
        className='sr-only'
        onChange={(event) => {
          selectFiles(event.target.files)
          event.target.value = ''
        }}
      />
      {entries.length > 0 && (
        <ul className='space-y-1.5'>
          {entries.map((entry) => (
            <li
              key={entry.id}
              className='flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 font-normal'
            >
              {entry.status === 'uploading' && <Loader2 className='size-4 shrink-0 animate-spin text-primary' />}
              {entry.status === 'done' && <CheckCircle2 className='size-4 shrink-0 text-success' />}
              {entry.status === 'error' && <AlertCircle className='size-4 shrink-0 text-destructive' />}
              <span className='min-w-0 flex-1'>
                <span className='block truncate text-foreground'>{entry.file.name}</span>
                <span className={entry.error ? 'text-destructive' : 'text-muted-foreground'}>
                  {entry.error ?? formatFileSize(entry.file.size)}
                </span>
              </span>
              {entry.status !== 'uploading' && (
                <button
                  type='button'
                  onClick={() => commitEntries((current) => current.filter((item) => item.id !== entry.id))}
                  className='shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive'
                  aria-label={t('reports.removeAttachment', { name: entry.file.name })}
                >
                  <X className='size-4' />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string, locale: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(locale)
}

function formatDetailValue(value: unknown, yesLabel: string, noLabel: string) {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? yesLabel : noLabel
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function VoteDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) onClose()
  }, [fetcher.data, fetcher.state, onClose])

  return (
    <Dialog
      compact
      open
      onClose={onClose}
      titleId='board-vote-dialog-title'
      title={t('decisions.castVote')}
      description={t('decisions.voteConfirmation')}
      size='sm'
    >
      <fetcher.Form method='post' className='grid gap-3'>
        <input type='hidden' name='intent' value='vote' />
        <select name='voteValue' className={boardInput} defaultValue='APPROVE'>
          <option value='APPROVE'>{t('decisions.approve')}</option>
          <option value='REJECT'>{t('decisions.reject')}</option>
          <option value='ABSTAIN'>{t('decisions.abstain')}</option>
        </select>
        <textarea name='note' className={`${boardInput} min-h-24 py-2`} placeholder={t('decisions.note')} />
        <div className='flex justify-end gap-2'>
          <button
            type='button'
            onClick={onClose}
            className='h-10 rounded-md border border-border px-4 text-xs font-bold'
          >
            {t('common.cancel')}
          </button>
          <button
            disabled={fetcher.state !== 'idle'}
            className='h-10 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-60'
          >
            {t('decisions.submitVote')}
          </button>
        </div>
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </Dialog>
  )
}
