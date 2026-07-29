import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, MapPin, MessageSquareText, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { AnnotationResDtoOutput } from '~/api/model/annotations'
import {
  annotationControllerCreate,
  annotationControllerList,
  annotationControllerRemove,
  annotationControllerResolve
} from '~/api/operations/annotations/annotations'
import { useAuth } from '~/features/auth/context/auth-context'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { cn } from '~/shared/lib/cn'

export function TaskAnnotationPanel({ taskId, canCreate = false }: { taskId: string; canCreate?: boolean }) {
  const { t, i18n } = useTranslation('common')
  const { session } = useAuth()
  const [items, setItems] = useState<AnnotationResDtoOutput[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [content, setContent] = useState('')
  const [x, setX] = useState('')
  const [y, setY] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await annotationControllerList({ targetType: 'TASK', targetId: taskId, limit: 100, offset: 0 })
      setItems(response.data.items ?? [])
    } catch (loadError) {
      setError(extractApiErrorMessage(loadError, t('taskAnnotations.loadError')))
    } finally {
      setIsLoading(false)
    }
  }, [t, taskId])

  useEffect(() => {
    // The state updates happen after the API promise settles; this effect only
    // starts the external synchronization when the task scope changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const create = async () => {
    const note = content.trim()
    if (!note) return
    const xValue = Number(x)
    const yValue = Number(y)
    const hasCoordinates = x !== '' && y !== '' && Number.isFinite(xValue) && Number.isFinite(yValue)
    setIsMutating(true)
    try {
      await annotationControllerCreate({
        targetType: 'TASK',
        targetId: taskId,
        taskId,
        annotationType: 'TEXT',
        reviewStage: 'ASSISTANT',
        content: note,
        ...(hasCoordinates ? { coordinates: { x: xValue, y: yValue } } : {})
      })
      setContent('')
      setX('')
      setY('')
      setComposerOpen(false)
      toast.success(t('taskAnnotations.created'))
      await load()
    } catch (mutationError) {
      toast.error(extractApiErrorMessage(mutationError, t('taskAnnotations.mutationError')))
    } finally {
      setIsMutating(false)
    }
  }

  const mutate = async (id: string, action: 'resolve' | 'remove') => {
    setIsMutating(true)
    try {
      if (action === 'resolve') await annotationControllerResolve({ id })
      else await annotationControllerRemove({ id })
      toast.success(t(action === 'resolve' ? 'taskAnnotations.resolved' : 'taskAnnotations.removed'))
      await load()
    } catch (mutationError) {
      toast.error(extractApiErrorMessage(mutationError, t('taskAnnotations.mutationError')))
    } finally {
      setIsMutating(false)
    }
  }

  return (
    <section className='rounded-xl border border-border bg-card p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 className='flex items-center gap-2 text-sm font-bold text-foreground'>
            <MessageSquareText className='size-4 text-primary' aria-hidden='true' />
            {t('taskAnnotations.title')}
            <span className='rounded-full bg-muted px-2 py-0.5 text-[10px]'>{items.length}</span>
          </h3>
          <p className='mt-1 max-w-2xl text-xs leading-5 text-muted-foreground'>
            {t(canCreate ? 'taskAnnotations.authorGuide' : 'taskAnnotations.readerGuide')}
          </p>
        </div>
        {canCreate && (
          <button
            type='button'
            onClick={() => setComposerOpen((value) => !value)}
            className='inline-flex h-9 items-center gap-2 rounded-md border border-primary px-3 text-xs font-bold text-primary'
          >
            <Plus className='size-4' /> {t('taskAnnotations.add')}
          </button>
        )}
      </div>

      {composerOpen && (
        <div className='mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4'>
          <label className='grid gap-1 text-xs font-bold text-foreground'>
            {t('taskAnnotations.content')}
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={3}
              maxLength={5000}
              placeholder={t('taskAnnotations.placeholder')}
              className='rounded-lg border border-input bg-background p-3 text-sm font-normal'
            />
          </label>
          <div className='mt-3 grid gap-3 sm:grid-cols-2'>
            <label className='grid gap-1 text-xs font-bold text-foreground'>
              {t('taskAnnotations.x')}
              <input
                value={x}
                onChange={(event) => setX(event.target.value)}
                type='number'
                min={0}
                max={100}
                step='0.1'
                placeholder='0–100'
                className='h-10 rounded-md border border-input bg-background px-3 text-sm font-normal'
              />
            </label>
            <label className='grid gap-1 text-xs font-bold text-foreground'>
              {t('taskAnnotations.y')}
              <input
                value={y}
                onChange={(event) => setY(event.target.value)}
                type='number'
                min={0}
                max={100}
                step='0.1'
                placeholder='0–100'
                className='h-10 rounded-md border border-input bg-background px-3 text-sm font-normal'
              />
            </label>
          </div>
          <p className='mt-2 text-[11px] leading-5 text-muted-foreground'>{t('taskAnnotations.coordinateGuide')}</p>
          <div className='mt-3 flex justify-end gap-2'>
            <button
              type='button'
              onClick={() => setComposerOpen(false)}
              className='h-9 rounded-md border border-border px-3 text-xs font-bold'
            >
              {t('taskAnnotations.cancel')}
            </button>
            <button
              type='button'
              onClick={() => void create()}
              disabled={!content.trim() || isMutating}
              className='inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50'
            >
              {isMutating && <Loader2 className='size-4 animate-spin' />}
              {t('taskAnnotations.save')}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className='flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground'>
          <Loader2 className='size-4 animate-spin' /> {t('taskAnnotations.loading')}
        </div>
      ) : error ? (
        <div
          className='mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive'
          role='alert'
        >
          {error}
          <button type='button' onClick={() => void load()} className='ml-2 font-bold underline'>
            {t('taskAnnotations.retry')}
          </button>
        </div>
      ) : (
        <div className='mt-4 space-y-2'>
          {items.map((item) => {
            const isAuthor = Boolean(session?.user.id && item.authorId === session.user.id)
            const coordinates = item.coordinates as { x?: number; y?: number } | null
            return (
              <article
                key={item.id}
                className={cn(
                  'rounded-xl border p-3',
                  item.isResolved ? 'border-border bg-muted/30 opacity-70' : 'border-primary/20 bg-background'
                )}
              >
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <div>
                    <p className='text-xs font-bold text-foreground'>
                      {item.author?.displayName ?? item.authorRole ?? t('taskAnnotations.unknownAuthor')}
                    </p>
                    <p className='mt-0.5 text-[10px] text-muted-foreground'>
                      {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
                        new Date(item.createdAt)
                      )}
                    </p>
                  </div>
                  {item.isResolved && (
                    <span className='rounded-full bg-success/10 px-2 py-1 text-[10px] font-bold text-success'>
                      {t('taskAnnotations.resolvedBadge')}
                    </span>
                  )}
                </div>
                <p className='mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground'>
                  {item.content || t('taskAnnotations.noContent')}
                </p>
                {coordinates && (coordinates.x != null || coordinates.y != null) && (
                  <p className='mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground'>
                    <MapPin className='size-3.5' /> X {coordinates.x ?? '—'}% · Y {coordinates.y ?? '—'}%
                  </p>
                )}
                {canCreate && isAuthor && !item.isResolved && (
                  <div className='mt-3 flex flex-wrap gap-2 border-t border-border pt-3'>
                    <button
                      type='button'
                      disabled={isMutating}
                      onClick={() => void mutate(item.id, 'resolve')}
                      className='inline-flex h-8 items-center gap-1 rounded-md border border-success/30 px-2 text-[11px] font-bold text-success disabled:opacity-50'
                    >
                      <Check className='size-3.5' /> {t('taskAnnotations.resolve')}
                    </button>
                    <button
                      type='button'
                      disabled={isMutating}
                      onClick={() => void mutate(item.id, 'remove')}
                      className='inline-flex h-8 items-center gap-1 rounded-md border border-destructive/30 px-2 text-[11px] font-bold text-destructive disabled:opacity-50'
                    >
                      <Trash2 className='size-3.5' /> {t('taskAnnotations.remove')}
                    </button>
                  </div>
                )}
              </article>
            )
          })}
          {!items.length && (
            <p className='rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground'>
              {t('taskAnnotations.empty')}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
