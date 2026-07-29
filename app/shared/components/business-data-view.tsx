import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

const HIDDEN_FIELDS = new Set([
  'limit',
  'offset',
  'avatar',
  'avatarUrl',
  'fileKey',
  'filePath',
  'inputFileKey',
  'outputFileKey',
  'portfolioFiles',
  'uploadUrl',
  'downloadUrl'
])

export function BusinessDataView({ value, emptyText }: { value: unknown; emptyText?: string }) {
  const { t, i18n } = useTranslation('common')
  const fallback = emptyText ?? t('businessData.empty')

  return (
    <DataValue
      value={value}
      emptyText={fallback}
      language={i18n.language}
      label={(key) => t(`businessData.fields.${key}`, { defaultValue: humanize(key) })}
      valueLabel={(item) => t(`businessData.values.${item}`, { defaultValue: humanize(item) })}
      yesLabel={t('businessData.yes')}
      noLabel={t('businessData.no')}
    />
  )
}

function DataValue({
  value,
  emptyText,
  language,
  label,
  valueLabel,
  yesLabel,
  noLabel
}: {
  value: unknown
  emptyText: string
  language: string
  label: (key: string) => string
  valueLabel: (value: string) => string
  yesLabel: string
  noLabel: string
}) {
  if (value === null || value === undefined || value === '') return <EmptyValue text={emptyText} />

  if (Array.isArray(value)) {
    if (!value.length) return <EmptyValue text={emptyText} />
    if (value.every(isPrimitive)) {
      return (
        <div className='flex flex-wrap gap-2'>
          {value.map((item, index) => (
            <span
              key={`${String(item)}-${index}`}
              className='rounded-full bg-muted px-2.5 py-1 text-xs text-foreground'
            >
              {formatPrimitive(item, language, valueLabel, yesLabel, noLabel)}
            </span>
          ))}
        </div>
      )
    }
    return (
      <div className='space-y-3'>
        {value.map((item, index) => (
          <article key={objectKey(item, index)} className='rounded-lg border border-border bg-background/40 p-4'>
            <DataValue
              value={item}
              emptyText={emptyText}
              language={language}
              label={label}
              valueLabel={valueLabel}
              yesLabel={yesLabel}
              noLabel={noLabel}
            />
          </article>
        ))}
      </div>
    )
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (Array.isArray(record.items)) {
      return (
        <DataValue
          value={record.items}
          emptyText={emptyText}
          language={language}
          label={label}
          valueLabel={valueLabel}
          yesLabel={yesLabel}
          noLabel={noLabel}
        />
      )
    }

    const entries = Object.entries(record).filter(
      ([key, item]) => !isTechnicalField(key) && item !== null && item !== undefined && item !== ''
    )
    if (!entries.length) return <EmptyValue text={emptyText} />

    return (
      <dl className='grid gap-3'>
        {entries.map(([key, item]) => (
          <div key={key} className='grid gap-1 sm:grid-cols-[minmax(9rem,0.35fr)_minmax(0,1fr)] sm:gap-4'>
            <dt className='text-xs font-semibold text-muted-foreground'>{label(key)}</dt>
            <dd className='min-w-0 text-sm text-foreground'>
              {isPrimitive(item) ? (
                formatPrimitive(item, language, valueLabel, yesLabel, noLabel)
              ) : (
                <DataValue
                  value={item}
                  emptyText={emptyText}
                  language={language}
                  label={label}
                  valueLabel={valueLabel}
                  yesLabel={yesLabel}
                  noLabel={noLabel}
                />
              )}
            </dd>
          </div>
        ))}
      </dl>
    )
  }

  return (
    <p className='text-sm text-foreground'>
      {isPrimitive(value) ? formatPrimitive(value, language, valueLabel, yesLabel, noLabel) : String(value)}
    </p>
  )
}

function EmptyValue({ text }: { text: string }) {
  return <p className='text-sm text-muted-foreground'>{text}</p>
}

function isPrimitive(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function isTechnicalField(key: string) {
  return (
    key === 'id' ||
    key.endsWith('Id') ||
    key.endsWith('Ids') ||
    key.endsWith('Key') ||
    key.endsWith('Url') ||
    HIDDEN_FIELDS.has(key)
  )
}

function formatPrimitive(
  value: string | number | boolean,
  language: string,
  valueLabel: (value: string) => string,
  yesLabel: string,
  noLabel: string
): ReactNode {
  if (typeof value === 'boolean') return value ? yesLabel : noLabel
  if (typeof value === 'number') return new Intl.NumberFormat(language).format(value)
  if (looksLikeIsoDate(value)) {
    return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  }
  if (looksTechnical(value)) return '—'
  return /^[A-Z][A-Z0-9_]*$/.test(value) ? valueLabel(value) : value
}

function looksLikeIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value))
}

function looksTechnical(value: string) {
  return /^[0-9a-f]{24}$/i.test(value) || /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value) || value.startsWith('uploads/')
}

function objectKey(value: unknown, index: number) {
  if (value && typeof value === 'object' && 'id' in value) return String((value as { id: unknown }).id)
  return String(index)
}

function humanize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replace(/^./, (character) => character.toUpperCase())
}
