import { Link, useFetcher } from 'react-router'
import { ArrowLeft, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import type { EditorActionResult } from '../../types'

export const operationInput = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground'

export function OperationsLayout({
  titleKey,
  descriptionKey,
  hasError,
  children
}: {
  titleKey: string
  descriptionKey: string
  hasError?: boolean
  children: React.ReactNode
}) {
  const { t } = useTranslation('editor')
  return (
    <div className='space-y-7 pb-12'>
      <Link to='/dashboard/editor/operations' className='inline-flex items-center gap-2 text-sm font-bold text-primary'>
        <ArrowLeft className='size-4' />
        {t('operations.back')}
      </Link>
      <header>
        <p className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <Wrench className='size-4' />
          {t('operations.eyebrow')}
        </p>
        <h1 className='mt-2 text-3xl font-bold text-foreground'>{t(titleKey)}</h1>
        <p className='mt-2 text-sm text-muted-foreground'>{t(descriptionKey)}</p>
      </header>
      {hasError && (
        <p className='rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'>
          {t('errors.loadDescription')}
        </p>
      )}
      {children}
    </div>
  )
}

export function OperationPanel({
  icon: Icon,
  title,
  children
}: {
  icon: typeof Wrench
  title: string
  children: React.ReactNode
}) {
  return (
    <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <h2 className='mb-4 flex items-center gap-2 text-lg font-bold text-foreground'>
        <Icon className='size-5 text-primary' />
        {title}
      </h2>
      {children}
    </section>
  )
}

export function SeriesSelect({
  series,
  defaultValue,
  value,
  onChange,
  name = 'seriesId',
  required = true
}: {
  series: SeriesListResDtoOutputItemsItem[]
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  name?: string
  required?: boolean
}) {
  return (
    <select
      name={name}
      defaultValue={value === undefined ? defaultValue : undefined}
      value={value}
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      required={required}
      className={operationInput}
    >
      <option value=''>Series</option>
      {series.map((item) => (
        <option key={item.id} value={item.id}>
          {item.title} · {item.status}
        </option>
      ))}
    </select>
  )
}

export function OperationAction({
  intent,
  label,
  destructive
}: {
  intent: string
  label: string
  destructive?: boolean
}) {
  return (
    <button
      name='intent'
      value={intent}
      className={`min-h-9 rounded-md px-3 text-xs font-bold ${
        destructive ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'
      }`}
    >
      {label}
    </button>
  )
}

export function OperationFeedback({ data }: { data?: EditorActionResult }) {
  const { t } = useTranslation('editor')
  if (!data) return null
  return (
    <p className={`mt-3 text-xs font-bold ${data.ok ? 'text-primary' : 'text-destructive'}`}>
      {data.ok ? t('messages.operationCompleted') : t('errors.actionFailed')}
    </p>
  )
}

export function useOperationFetcher() {
  return useFetcher<EditorActionResult>()
}
