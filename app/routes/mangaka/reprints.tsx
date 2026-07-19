import { useState } from 'react'
import { BookCopy, Loader2, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFetcher as useRouteFetcher } from 'react-router'

import { contractControllerGetContracts } from '~/api/operations/contracts/contracts'
import {
  reprintRequestControllerFindAll,
  reprintRequestControllerMangakaReview,
  reprintRequestControllerUpdateChapterManuscript
} from '~/api/operations/reprint-requests/reprint-requests'
import type { ReprintRequestResDtoOutput } from '~/api/model/reprint-requests'
import { SignUploadBodyDtoAssetType } from '~/api/model/uploads/signUploadBodyDtoAssetType'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { uploadToR2 } from '~/shared/lib/upload/upload-to-r2'

type ActionResult = { ok: boolean; intent: string; message?: string }

export async function clientLoader() {
  const [requestsResponse, contractsResponse] = await Promise.all([
    reprintRequestControllerFindAll({
      status: undefined as unknown as string,
      seriesId: undefined as unknown as string
    }),
    contractControllerGetContracts()
  ])
  return {
    requests: requestsResponse.data,
    contractTypes: Object.fromEntries(
      contractsResponse.data
        .filter((contract) => contract.status === 'FULLY_EXECUTED')
        .map((contract) => [contract.seriesId, contract.contractType])
    ) as Record<string, 'FULL_BUYOUT' | 'REVENUE_SHARE'>
  }
}

export async function clientAction({ request }: { request: Request }): Promise<ActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'review') {
      await reprintRequestControllerMangakaReview(
        { id: required(form, 'reprintId') },
        { accept: required(form, 'accept') === 'true', reason: String(form.get('reason') ?? '') || undefined }
      )
    } else if (intent === 'submitManuscript') {
      const chapterId = required(form, 'chapterId')
      await reprintRequestControllerUpdateChapterManuscript(
        { id: required(form, 'reprintId'), chapterId },
        { originalChapterId: chapterId, manuscriptFile: required(form, 'manuscriptFile') }
      )
    } else {
      return { ok: false, intent, message: 'Thao tác không hợp lệ.' }
    }
    return { ok: true, intent }
  } catch (error) {
    return { ok: false, intent, message: extractApiErrorMessage(error, 'Không thể hoàn tất thao tác tái bản.') }
  }
}

function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '').trim()
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export default function MangakaReprintsRoute({
  loaderData
}: {
  loaderData: Awaited<ReturnType<typeof clientLoader>>
}) {
  const { t } = useTranslation('mangaka')
  return (
    <div className='space-y-6 pb-12'>
      <header>
        <p className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <BookCopy className='size-4' />
          {t('reprints.eyebrow')}
        </p>
        <h1 className='mt-2 text-3xl font-bold text-foreground'>{t('reprints.title')}</h1>
        <p className='mt-2 text-sm text-muted-foreground'>{t('reprints.description')}</p>
      </header>

      <div className='grid gap-4'>
        {loaderData.requests.map((item) => (
          <ReprintCard
            key={item.id}
            item={item}
            contractType={loaderData.contractTypes[item.seriesId]}
          />
        ))}
        {!loaderData.requests.length && (
          <p className='rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground'>
            {t('reprints.empty')}
          </p>
        )}
      </div>
    </div>
  )
}

function ReprintCard({
  item,
  contractType
}: {
  item: ReprintRequestResDtoOutput
  contractType?: 'FULL_BUYOUT' | 'REVENUE_SHARE'
}) {
  const { t } = useTranslation('mangaka')
  const fetcher = useRouteFetcher<ActionResult>()
  const canReview = ['PENDING', 'MANGAKA_REVIEW'].includes(item.status) && contractType === 'REVENUE_SHARE'
  const canSubmit =
    item.revisionMode === 'WITH_REVISION' && ['BOARD_APPROVED', 'APPROVED', 'IN_PRODUCTION'].includes(item.status)

  return (
    <article className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 className='font-bold text-foreground'>{item.series?.title ?? t('reprints.unknownSeries')}</h2>
          <p className='mt-1 text-xs text-muted-foreground'>
            {t(`reprints.revisionModes.${item.revisionMode}`)} · {t('reprints.chapterRange', {
              from: item.chapterRangeStart,
              to: item.chapterRangeEnd
            })}
          </p>
        </div>
        <span className='rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground'>
          {t(`reprints.statuses.${item.status}`, { defaultValue: item.status })}
        </span>
      </div>
      <p className='mt-3 text-sm text-muted-foreground'>{item.reason}</p>

      {canReview && (
        <fetcher.Form method='post' className='mt-4 grid gap-2 rounded-lg border border-border p-4 sm:grid-cols-[1fr_auto_auto]'>
          <input type='hidden' name='intent' value='review' />
          <input type='hidden' name='reprintId' value={item.id} />
          <input name='reason' className={inputClass} placeholder={t('reprints.reviewReason')} />
          <button name='accept' value='true' className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
            {t('reprints.accept')}
          </button>
          <button name='accept' value='false' className='h-10 rounded-md border border-destructive px-4 text-sm font-bold text-destructive'>
            {t('reprints.reject')}
          </button>
        </fetcher.Form>
      )}

      {item.status === 'PENDING' && contractType === 'FULL_BUYOUT' && (
        <p className='mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground'>{t('reprints.fullBuyoutNotice')}</p>
      )}

      {!!item.chapters.length && (
        <div className='mt-4 space-y-2 border-t border-border pt-4'>
          <h3 className='text-sm font-bold'>{t('reprints.chapters')}</h3>
          {item.chapters.map((chapter, index) => (
            <div key={chapter.originalChapterId} className='rounded-lg border border-border p-3'>
              <div className='flex flex-wrap items-center justify-between gap-2 text-sm'>
                <strong>{t('reprints.chapter', { number: index + 1 })}</strong>
                <span>{t(`reprints.chapterStatuses.${chapter.status}`)}</span>
              </div>
              {canSubmit && ['PENDING', 'IN_REVISION'].includes(chapter.status) && chapter.originalChapterId && (
                <ManuscriptSubmit reprintId={item.id} chapterId={chapter.originalChapterId} />
              )}
            </div>
          ))}
        </div>
      )}

      {fetcher.data && (
        <p className={`mt-3 text-sm font-semibold ${fetcher.data.ok ? 'text-primary' : 'text-destructive'}`}>
          {fetcher.data.ok ? t('reprints.success') : fetcher.data.message}
        </p>
      )}
    </article>
  )
}

function ManuscriptSubmit({ reprintId, chapterId }: { reprintId: string; chapterId: string }) {
  const { t } = useTranslation('mangaka')
  const fetcher = useRouteFetcher<ActionResult>()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function submit(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const manuscriptFile = await uploadToR2(file, SignUploadBodyDtoAssetType.OTHER)
      fetcher.submit({ intent: 'submitManuscript', reprintId, chapterId, manuscriptFile }, { method: 'post' })
    } catch (uploadError) {
      setError(extractApiErrorMessage(uploadError, t('reprints.uploadFailed')))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className='mt-3'>
      <label className='inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground'>
        {uploading || fetcher.state !== 'idle' ? <Loader2 className='size-4 animate-spin' /> : <Upload className='size-4' />}
        {t('reprints.submitManuscript')}
        <input
          type='file'
          className='sr-only'
          accept='image/png,image/jpeg,image/webp,application/pdf'
          disabled={uploading || fetcher.state !== 'idle'}
          onChange={(event) => void submit(event.target.files?.[0])}
        />
      </label>
      {(error || fetcher.data?.message) && <p className='mt-2 text-xs text-destructive'>{error || fetcher.data?.message}</p>}
      {fetcher.data?.ok && <p className='mt-2 text-xs font-semibold text-primary'>{t('reprints.manuscriptSubmitted')}</p>}
    </div>
  )
}

const inputClass = 'h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground'
