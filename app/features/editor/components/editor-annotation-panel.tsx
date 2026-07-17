import { MessageSquareText } from 'lucide-react'
import { useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'

import type { AnnotationListResDtoOutputItemsItem } from '~/api/model/annotations'
import type { EditorActionResult } from '../types'

export function EditorAnnotationPanel({
  title,
  annotations,
  target,
  targetId,
  contextFields = {},
  createIntent = 'createAnnotation',
  resolveIntent = 'resolveAnnotation',
  removeIntent = 'removeAnnotation'
}: {
  title: string
  annotations: AnnotationListResDtoOutputItemsItem[]
  target: 'NAME' | 'MANUSCRIPT'
  targetId: string
  contextFields?: Record<string, string>
  createIntent?: string
  resolveIntent?: string
  removeIntent?: string
}) {
  const { t } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
  const hiddenFields = { ...contextFields, annotationTarget: target, nameId: target === 'NAME' ? targetId : '' }

  return (
    <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <h2 className='flex items-center gap-2 text-lg font-bold text-foreground'>
        <MessageSquareText className='size-5 text-primary' />
        {title}
      </h2>
      <fetcher.Form method='post' className='mt-4 grid gap-3'>
        {Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type='hidden' name={name} value={value} />
        ))}
        <textarea
          name='content'
          required
          maxLength={5000}
          rows={2}
          className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground'
          placeholder={t('chapterReview.annotationPlaceholder')}
        />
        <details className='rounded-md border border-border p-3'>
          <summary className='cursor-pointer text-xs font-bold text-muted-foreground'>
            {t('chapterReview.annotationCoordinates')}
          </summary>
          <div className='mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4'>
            <CoordinateInput name='x' label='X' min={0} />
            <CoordinateInput name='y' label='Y' min={0} />
            <CoordinateInput name='width' label={t('chapterReview.width')} min={1} />
            <CoordinateInput name='height' label={t('chapterReview.height')} min={1} />
          </div>
        </details>
        <button
          name='intent'
          value={createIntent}
          disabled={fetcher.state !== 'idle'}
          className='justify-self-start rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50'
        >
          {t('actions.add')}
        </button>
      </fetcher.Form>
      <div className='mt-4 space-y-2'>
        {annotations.map((item) => (
          <article key={item.id} className='rounded-lg border border-border p-3'>
            <p className={`text-sm ${item.isResolved ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {item.content}
            </p>
            {item.coordinates && (
              <p className='mt-1 text-xs text-muted-foreground'>{formatCoordinates(item.coordinates)}</p>
            )}
            <fetcher.Form method='post' className='mt-2 flex gap-2'>
              {Object.entries(contextFields).map(([name, value]) => (
                <input key={name} type='hidden' name={name} value={value} />
              ))}
              <input type='hidden' name='annotationId' value={item.id} />
              {!item.isResolved && (
                <button name='intent' value={resolveIntent} className='text-xs font-bold text-primary'>
                  {t('actions.resolve')}
                </button>
              )}
              <button name='intent' value={removeIntent} className='text-xs font-bold text-destructive'>
                {t('actions.remove')}
              </button>
            </fetcher.Form>
          </article>
        ))}
        {!annotations.length && <p className='text-sm text-muted-foreground'>{t('chapterReview.emptyAnnotations')}</p>}
      </div>
    </section>
  )
}

function CoordinateInput({ name, label, min }: { name: string; label: string; min: number }) {
  return (
    <label className='grid gap-1 text-xs font-semibold text-muted-foreground'>
      {label}
      <input
        name={name}
        type='number'
        min={min}
        step={1}
        className='h-9 rounded-md border border-input bg-background px-2 text-foreground'
      />
    </label>
  )
}

function formatCoordinates(coordinates: Record<string, unknown>) {
  return Object.entries(coordinates)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ')
}
