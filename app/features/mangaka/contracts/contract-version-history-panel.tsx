import { History } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import type { ContractVersionResDtoOutput } from '~/api/model/contracts'
import { cn } from '~/shared/lib/cn'

interface ContractVersionHistoryPanelProps {
  contractId: string
  versions: ContractVersionResDtoOutput[]
  loadFailed: boolean
  className?: string
}

export function ContractVersionHistoryPanel({
  contractId,
  versions,
  loadFailed,
  className
}: ContractVersionHistoryPanelProps) {
  const { t, i18n } = useTranslation('mangaka')
  const language = i18n.resolvedLanguage ?? i18n.language

  return (
    <section className={cn('rounded-xl border border-border bg-card p-5 shadow-sm', className)}>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 className='flex items-center gap-2 text-lg font-bold text-foreground'>
            <History className='size-5 text-primary' aria-hidden='true' />
            {t('contracts.versions.title')}
          </h2>
          <p className='mt-1 text-sm text-muted-foreground'>{t('contracts.versions.description')}</p>
        </div>
        <span className='rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground'>
          {t('contracts.versions.count', { count: versions.length })}
        </span>
      </div>

      {loadFailed && (
        <p
          role='status'
          className='mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'
        >
          {t('contracts.versions.loadFailed')}
        </p>
      )}

      {!loadFailed && !versions.length && (
        <p className='mt-4 text-sm text-muted-foreground'>{t('contracts.versions.empty')}</p>
      )}

      {!!versions.length && (
        <ol className='mt-4 space-y-3'>
          {versions.map((version) => (
            <li key={version.id}>
              <Link
                to={`/dashboard/mangaka/contracts/${contractId}/versions/${version.id}`}
                className='block rounded-lg border border-border p-4 transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
              >
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <span className='font-semibold text-foreground'>
                    {t('contracts.versions.version', { number: version.versionNumber })}
                  </span>
                  <time className='text-xs text-muted-foreground' dateTime={version.createdAt}>
                    {formatDateTime(version.createdAt, language)}
                  </time>
                </div>
                <p className='mt-2 line-clamp-2 text-sm text-muted-foreground'>
                  {version.note || t('contracts.versions.noNote')}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function formatDateTime(value: string, language: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(language)
}
