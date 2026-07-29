import { BookOpenText, Eye, Loader2, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type {
  PublicationVersionListResDtoOutputItemsItem,
  PublicationVersionResDtoOutput
} from '~/api/model/publication-versions'
import { Button, Dialog } from '~/shared/ui'

type PublicationVersionsPanelProps = {
  versions: PublicationVersionListResDtoOutputItemsItem[]
  selectedVersionId: string | null
  selectedVersion: PublicationVersionResDtoOutput | null
  isLoading: boolean
  isDetailLoading: boolean
  listError: string | null
  detailError: string | null
  onRefresh: () => void
  onSelect: (id: string) => void
  onCloseDetail: () => void
}

function formatDate(iso: string, locale: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

function versionTypeLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  versionType: string | null
): string {
  if (!versionType) return t('seriesDetail.publicationVersions.notSpecified')
  return t(`seriesDetail.publicationVersions.versionType.${versionType}`, {
    defaultValue: t('seriesDetail.publicationVersions.notSpecified')
  })
}

/** Read-only registry of the publication versions available for this series. */
export function PublicationVersionsPanel({
  versions,
  selectedVersionId,
  selectedVersion,
  isLoading,
  isDetailLoading,
  listError,
  detailError,
  onRefresh,
  onSelect,
  onCloseDetail
}: PublicationVersionsPanelProps) {
  const { t, i18n } = useTranslation('mangaka')

  return (
    <section
      className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'
      aria-labelledby='publication-versions-title'
    >
      <header className='flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3'>
        <div className='flex items-center gap-2'>
          <BookOpenText className='h-4 w-4 text-muted-foreground' aria-hidden='true' />
          <div>
            <h2 id='publication-versions-title' className='text-sm font-bold uppercase tracking-wider'>
              {t('seriesDetail.publicationVersions.title')}
            </h2>
            <p className='mt-0.5 text-xs text-muted-foreground'>{t('seriesDetail.publicationVersions.description')}</p>
          </div>
        </div>
        <Button size='sm' variant='outline' onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={isLoading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} aria-hidden='true' />
          {t('seriesDetail.publicationVersions.refresh')}
        </Button>
      </header>

      <div className='p-5'>
        {isLoading && versions.length === 0 ? (
          <div className='flex items-center gap-2 py-6 text-sm text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin' aria-hidden='true' />
            {t('seriesDetail.publicationVersions.loading')}
          </div>
        ) : listError ? (
          <div
            role='alert'
            className='rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive'
          >
            <p>{listError}</p>
            <Button className='mt-3' size='sm' variant='outline' onClick={onRefresh}>
              {t('seriesDetail.publicationVersions.retry')}
            </Button>
          </div>
        ) : versions.length === 0 ? (
          <div className='py-7 text-center'>
            <BookOpenText className='mx-auto h-8 w-8 text-muted-foreground/50' aria-hidden='true' />
            <p className='mt-2 text-sm text-muted-foreground'>{t('seriesDetail.publicationVersions.empty')}</p>
          </div>
        ) : (
          <ul className='divide-y divide-border overflow-hidden rounded-lg border border-border'>
            {versions.map((version) => (
              <li key={version.id} className='flex flex-wrap items-center justify-between gap-3 px-4 py-3'>
                <div className='min-w-0'>
                  <p className='text-sm font-semibold text-foreground'>
                    {version.language} · {versionTypeLabel(t, version.versionType)}
                  </p>
                  <p className='mt-0.5 text-xs text-muted-foreground'>
                    {t(`seriesDetail.publicationVersions.readingDirection.${version.readingDirection}`)} ·{' '}
                    {t('seriesDetail.publicationVersions.createdAt', {
                      date: formatDate(version.createdAt, i18n.language)
                    })}
                  </p>
                </div>
                <Button size='sm' variant='outline' onClick={() => onSelect(version.id)}>
                  <Eye className='h-3.5 w-3.5' aria-hidden='true' />
                  {t('seriesDetail.publicationVersions.viewDetails')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PublicationVersionDetailDialog
        open={selectedVersionId !== null}
        version={selectedVersion}
        isLoading={isDetailLoading}
        error={detailError}
        onClose={onCloseDetail}
      />
    </section>
  )
}

function PublicationVersionDetailDialog({
  open,
  version,
  isLoading,
  error,
  onClose
}: {
  open: boolean
  version: PublicationVersionResDtoOutput | null
  isLoading: boolean
  error: string | null
  onClose: () => void
}) {
  const { t, i18n } = useTranslation('mangaka')
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size='sm'
      titleId='publication-version-detail-title'
      descriptionId='publication-version-detail-description'
      title={t('seriesDetail.publicationVersions.detail.title')}
      description={t('seriesDetail.publicationVersions.detail.description')}
      footer={
        <Button variant='outline' onClick={onClose}>
          {t('seriesDetail.publicationVersions.close')}
        </Button>
      }
    >
      {isLoading ? (
        <p className='flex items-center gap-2 text-sm text-muted-foreground'>
          <Loader2 className='h-4 w-4 animate-spin' aria-hidden='true' />
          {t('seriesDetail.publicationVersions.detail.loading')}
        </p>
      ) : error ? (
        <p
          role='alert'
          className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
        >
          {error}
        </p>
      ) : version ? (
        <dl className='grid gap-4 text-sm'>
          <Detail label={t('seriesDetail.publicationVersions.detail.language')} value={version.language} />
          <Detail
            label={t('seriesDetail.publicationVersions.detail.versionType')}
            value={versionTypeLabel(t, version.versionType)}
          />
          <Detail
            label={t('seriesDetail.publicationVersions.detail.readingDirection')}
            value={t(`seriesDetail.publicationVersions.readingDirection.${version.readingDirection}`)}
          />
          <Detail
            label={t('seriesDetail.publicationVersions.detail.createdAt')}
            value={formatDate(version.createdAt, i18n.language)}
          />
          <Detail
            label={t('seriesDetail.publicationVersions.detail.notes')}
            value={version.notes?.trim() || t('seriesDetail.publicationVersions.notSpecified')}
          />
        </dl>
      ) : null}
    </Dialog>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className='text-xs font-medium text-muted-foreground'>{label}</dt>
      <dd className='mt-0.5 break-words text-foreground'>{value}</dd>
    </div>
  )
}
