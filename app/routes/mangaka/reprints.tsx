import { useState } from 'react'
import { BookCopy, CheckCircle2, Download, FileUp, Info, Loader2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useFetcher } from 'react-router'

import type { ReprintRequestResDtoOutput } from '~/api/model/reprint-requests'
import { SignUploadBodyDtoAssetType } from '~/api/model/uploads/signUploadBodyDtoAssetType'
import {
  reprintRequestControllerFindAll,
  reprintRequestControllerFindById,
  reprintRequestControllerGetChapterById,
  reprintRequestControllerGetChapters,
  reprintRequestControllerMangakaReview,
  reprintRequestControllerUpdateChapterManuscript
} from '~/api/operations/reprint-requests/reprint-requests'
import { storageControllerSignDownload } from '~/api/operations/uploads/uploads'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { cn } from '~/shared/lib/cn'
import { uploadToR2 } from '~/shared/lib/upload/upload-to-r2'

type ReprintActionResult = { ok: boolean; message: string }

export async function clientLoader({ request }: { request: Request }) {
  const requestedId = new URL(request.url).searchParams.get('requestId')?.trim() ?? ''
  try {
    const listResponse = await reprintRequestControllerFindAll({
      status: undefined as unknown as string,
      seriesId: undefined as unknown as string
    })
    const details = (
      await Promise.all(
        listResponse.data.map((item) =>
          reprintRequestControllerFindById({ id: item.id })
            .then((response) => response.data)
            .catch(() => null)
        )
      )
    ).filter((item): item is ReprintRequestResDtoOutput => item !== null)
    const selectedId = details.some((item) => item.id === requestedId) ? requestedId : (details[0]?.id ?? '')
    const selected = details.find((item) => item.id === selectedId) ?? null
    const chapters = selected
      ? await reprintRequestControllerGetChapters({ id: selected.id })
          .then((response) => response.data)
          .catch(() => selected.chapters)
      : []
    return { requests: details, selected, chapters, hasError: false }
  } catch {
    return { requests: [], selected: null, chapters: [], hasError: true }
  }
}

export async function clientAction({ request }: { request: Request }): Promise<ReprintActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    const requestId = required(form, 'requestId')
    if (intent === 'accept' || intent === 'reject') {
      await reprintRequestControllerMangakaReview(
        { id: requestId },
        { accept: intent === 'accept', reason: String(form.get('reason') ?? '').trim() || undefined }
      )
      return { ok: true, message: intent === 'accept' ? 'reprints.feedback.accepted' : 'reprints.feedback.rejected' }
    }
    if (intent === 'uploadManuscript') {
      const originalChapterId = required(form, 'originalChapterId')
      const chapterResponse = await reprintRequestControllerGetChapterById({
        id: requestId,
        chapterId: originalChapterId
      })
      if (chapterResponse.status !== 200) throw new Error('Chapter unavailable')
      const file = form.get('manuscript')
      if (!(file instanceof File) || file.size === 0) throw new Error('reprints.errors.fileRequired')
      const manuscriptFile = await uploadToR2(file, SignUploadBodyDtoAssetType.DOCUMENT)
      await reprintRequestControllerUpdateChapterManuscript(
        { id: requestId, chapterId: originalChapterId },
        { originalChapterId, manuscriptFile }
      )
      return { ok: true, message: 'reprints.feedback.manuscriptSubmitted' }
    }
    return { ok: false, message: 'reprints.errors.invalidAction' }
  } catch (error) {
    const fallback =
      error instanceof Error && error.message.startsWith('reprints.') ? error.message : 'reprints.errors.generic'
    return { ok: false, message: extractApiErrorMessage(error, fallback) }
  }
}

function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '').trim()
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export default function MangakaReprintsRoute({ loaderData }: { loaderData: Awaited<ReturnType<typeof clientLoader>> }) {
  const { t, i18n } = useTranslation('mangaka')
  const { requests, selected, chapters, hasError } = loaderData

  return (
    <div className='space-y-6 pb-12'>
      <header>
        <p className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <BookCopy className='size-4' aria-hidden='true' /> {t('reprints.eyebrow')}
        </p>
        <h1 className='mt-2 text-3xl font-bold text-foreground'>{t('reprints.title')}</h1>
        <p className='mt-2 max-w-3xl text-sm leading-6 text-muted-foreground'>{t('reprints.description')}</p>
      </header>

      <div className='flex items-start gap-3 rounded-xl border border-info/30 bg-info/5 p-4'>
        <Info className='mt-0.5 size-5 shrink-0 text-info' aria-hidden='true' />
        <div>
          <p className='text-sm font-bold text-foreground'>{t('reprints.guideTitle')}</p>
          <p className='mt-1 text-xs leading-5 text-muted-foreground'>{t('reprints.guide')}</p>
        </div>
      </div>

      {hasError && <Feedback ok={false} message={t('reprints.errors.load')} />}

      <div className='grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]'>
        <aside className='space-y-2 rounded-2xl border border-border bg-card p-3 shadow-sm'>
          <h2 className='px-2 pb-2 text-sm font-bold text-foreground'>{t('reprints.requestList')}</h2>
          {requests.map((item) => (
            <Link
              key={item.id}
              to={`?requestId=${encodeURIComponent(item.id)}`}
              className={cn(
                'block rounded-xl border p-3 transition-colors',
                selected?.id === item.id
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-muted/30 hover:border-border'
              )}
            >
              <div className='flex items-start justify-between gap-2'>
                <p className='line-clamp-2 text-sm font-bold text-foreground'>
                  {item.series?.title ?? t('reprints.unknownSeries')}
                </p>
                <StatusBadge status={item.status} />
              </div>
              <p className='mt-2 text-xs text-muted-foreground'>
                {t('reprints.chapterRange', { from: item.chapterRangeStart ?? '—', to: item.chapterRangeEnd ?? '—' })}
              </p>
            </Link>
          ))}
          {!requests.length && (
            <p className='px-3 py-8 text-center text-xs text-muted-foreground'>{t('reprints.empty')}</p>
          )}
        </aside>

        {selected ? (
          <main className='space-y-5'>
            <section className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  <h2 className='text-xl font-bold text-foreground'>
                    {selected.series?.title ?? t('reprints.unknownSeries')}
                  </h2>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(new Date(selected.createdAt))}
                  </p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <div className='mt-5 grid gap-3 sm:grid-cols-3'>
                <Fact label={t('reprints.mode')} value={t(`reprints.modes.${selected.revisionMode ?? 'UNKNOWN'}`)} />
                <Fact
                  label={t('reprints.range')}
                  value={`${selected.chapterRangeStart ?? '—'} – ${selected.chapterRangeEnd ?? '—'}`}
                />
                <Fact label={t('reprints.chapterCount')} value={String(chapters.length)} />
              </div>
              <div className='mt-4 rounded-xl bg-muted/40 p-4'>
                <p className='text-xs font-bold text-foreground'>{t('reprints.reason')}</p>
                <p className='mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground'>
                  {selected.reason || t('reprints.noReason')}
                </p>
              </div>
            </section>

            {selected.status === 'PROPOSED' && <ReviewPanel requestId={selected.id} />}

            <section className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
              <div>
                <h2 className='text-base font-bold text-foreground'>{t('reprints.chaptersTitle')}</h2>
                <p className='mt-1 text-xs leading-5 text-muted-foreground'>{t('reprints.chaptersGuide')}</p>
              </div>
              <div className='mt-4 grid gap-3'>
                {chapters.map((chapter, index) => (
                  <ReprintChapterCard
                    key={chapter.originalChapterId ?? index}
                    requestId={selected.id}
                    chapter={chapter}
                    number={selected.chapterRangeStart == null ? index + 1 : selected.chapterRangeStart + index}
                    canUpload={selected.revisionMode === 'WITH_REVISION' && selected.status === 'IN_PRODUCTION'}
                  />
                ))}
                {!chapters.length && (
                  <p className='py-8 text-center text-sm text-muted-foreground'>{t('reprints.noChapters')}</p>
                )}
              </div>
            </section>
          </main>
        ) : (
          <div className='flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground'>
            {t('reprints.selectHint')}
          </div>
        )}
      </div>
    </div>
  )
}

function ReviewPanel({ requestId }: { requestId: string }) {
  const { t } = useTranslation('mangaka')
  const fetcher = useFetcher<ReprintActionResult>()
  return (
    <section className='rounded-2xl border border-warning/30 bg-warning/5 p-5'>
      <h2 className='text-base font-bold text-foreground'>{t('reprints.reviewTitle')}</h2>
      <p className='mt-1 text-xs leading-5 text-muted-foreground'>{t('reprints.reviewGuide')}</p>
      <fetcher.Form method='post' className='mt-4 grid gap-3'>
        <input type='hidden' name='requestId' value={requestId} />
        <label className='grid gap-1 text-xs font-bold text-foreground'>
          {t('reprints.reviewReason')}
          <textarea
            name='reason'
            rows={3}
            maxLength={1000}
            placeholder={t('reprints.reviewReasonPlaceholder')}
            className='rounded-lg border border-input bg-background p-3 text-sm font-normal'
          />
        </label>
        <div className='flex flex-wrap gap-2'>
          <button
            name='intent'
            value='accept'
            disabled={fetcher.state !== 'idle'}
            className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'
          >
            <CheckCircle2 className='size-4' /> {t('reprints.accept')}
          </button>
          <button
            name='intent'
            value='reject'
            disabled={fetcher.state !== 'idle'}
            className='inline-flex h-10 items-center gap-2 rounded-md border border-destructive px-4 text-sm font-bold text-destructive disabled:opacity-50'
          >
            <XCircle className='size-4' /> {t('reprints.reject')}
          </button>
        </div>
      </fetcher.Form>
      {fetcher.data && <Feedback ok={fetcher.data.ok} message={t(fetcher.data.message)} />}
    </section>
  )
}

function ReprintChapterCard({
  requestId,
  chapter,
  number,
  canUpload
}: {
  requestId: string
  chapter: { originalChapterId: string | null; manuscriptFile: string | null; status: string }
  number: number
  canUpload: boolean
}) {
  const { t } = useTranslation('mangaka')
  const fetcher = useFetcher<ReprintActionResult>()
  const [isDownloading, setIsDownloading] = useState(false)
  const download = async () => {
    if (!chapter.manuscriptFile) return
    setIsDownloading(true)
    try {
      const response = await storageControllerSignDownload({ key: chapter.manuscriptFile })
      window.open(response.data.downloadUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setIsDownloading(false)
    }
  }
  return (
    <article className='rounded-xl border border-border bg-muted/20 p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <p className='text-sm font-bold text-foreground'>{t('reprints.chapter', { number })}</p>
          <p className='mt-1 text-xs text-muted-foreground'>
            {t(`reprints.chapterStatuses.${chapter.status}`, { defaultValue: chapter.status })}
          </p>
        </div>
        {chapter.manuscriptFile && (
          <button
            type='button'
            onClick={() => void download()}
            disabled={isDownloading}
            className='inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-bold disabled:opacity-50'
          >
            {isDownloading ? <Loader2 className='size-4 animate-spin' /> : <Download className='size-4' />}
            {t('reprints.download')}
          </button>
        )}
      </div>
      {canUpload && chapter.originalChapterId && (
        <fetcher.Form
          method='post'
          encType='multipart/form-data'
          className='mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-[1fr_auto]'
        >
          <input type='hidden' name='requestId' value={requestId} />
          <input type='hidden' name='originalChapterId' value={chapter.originalChapterId} />
          <input
            name='manuscript'
            type='file'
            required
            accept='image/png,image/jpeg,image/webp,application/pdf'
            className='min-w-0 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:font-bold'
          />
          <button
            name='intent'
            value='uploadManuscript'
            disabled={fetcher.state !== 'idle'}
            className='inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50'
          >
            {fetcher.state !== 'idle' ? <Loader2 className='size-4 animate-spin' /> : <FileUp className='size-4' />}
            {t('reprints.submitManuscript')}
          </button>
        </fetcher.Form>
      )}
      {fetcher.data && <Feedback ok={fetcher.data.ok} message={t(fetcher.data.message)} />}
    </article>
  )
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation('mangaka')
  return (
    <span className='shrink-0 rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-foreground'>
      {t(`reprints.statuses.${status}`, { defaultValue: status })}
    </span>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-xl border border-border bg-background p-3'>
      <p className='text-[10px] font-bold uppercase tracking-wide text-muted-foreground'>{label}</p>
      <p className='mt-1 text-sm font-semibold text-foreground'>{value}</p>
    </div>
  )
}

function Feedback({ ok, message }: ReprintActionResult) {
  return (
    <p
      role={ok ? 'status' : 'alert'}
      className={cn('mt-3 text-xs font-semibold', ok ? 'text-success' : 'text-destructive')}
    >
      {message}
    </p>
  )
}
