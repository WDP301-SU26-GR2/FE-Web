import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, BookOpen, ImageIcon, Loader2, Search } from 'lucide-react'
import { useSearchParams } from 'react-router'

import type { PageListResDtoOutputItemsItem } from '~/api/model/chapters'
import type { TaskListResDtoOutputItemsItem } from '~/api/model/task'
import { chapterControllerListPages } from '~/api/operations/chapters/chapters'
import { taskControllerListTasks } from '~/api/operations/task/task'
import { useTaskSignedUrl } from '~/shared/hooks/use-task-signed-url'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { Button } from '~/shared/ui'

export function meta() {
  return [{ title: 'Các trang chương - MangakaStudio Pro' }]
}

export default function AssistantChapterPagesRoute() {
  const { t } = useTranslation('assistant')
  const [searchParams, setSearchParams] = useSearchParams()
  const chapterId = searchParams.get('chapterId')?.trim() ?? ''
  const [draftChapterId, setDraftChapterId] = useState(chapterId)
  const [pages, setPages] = useState<PageListResDtoOutputItemsItem[]>([])
  const [tasks, setTasks] = useState<TaskListResDtoOutputItemsItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!chapterId) return

    const controller = new AbortController()
    void (async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [pageResponse, taskResponse] = await Promise.all([
          chapterControllerListPages({ id: chapterId }, { signal: controller.signal }),
          taskControllerListTasks({ chapterId, limit: 100 }, { signal: controller.signal })
        ])
        if (controller.signal.aborted) return
        setPages([...(pageResponse.data.items ?? [])].sort((left, right) => left.pageNumber - right.pageNumber))
        setTasks(taskResponse.data.items ?? [])
      } catch (cause) {
        if (!controller.signal.aborted) {
          setPages([])
          setTasks([])
          setError(extractApiErrorMessage(cause, t('chapterPages.errors.loadFailed')))
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [chapterId, t])

  const taskByPageId = useMemo(() => {
    const result = new Map<string, TaskListResDtoOutputItemsItem>()
    for (const task of tasks) {
      if (!result.has(task.pageId)) result.set(task.pageId, task)
    }
    return result
  }, [tasks])

  const submitChapterId = () => {
    const next = draftChapterId.trim()
    setSearchParams(next ? { chapterId: next } : {})
    if (!next) {
      setPages([])
      setTasks([])
      setError(null)
    }
  }

  return (
    <div className='space-y-6 pb-12'>
      <header className='rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm sm:p-7'>
        <div className='flex items-start gap-3'>
          <span className='rounded-xl bg-primary/10 p-2.5 text-primary'>
            <BookOpen className='size-5' />
          </span>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>{t('chapterPages.title')}</h1>
            <p className='mt-1 max-w-3xl text-sm leading-6 text-muted-foreground'>{t('chapterPages.description')}</p>
          </div>
        </div>
        <form
          className='mt-5 flex flex-col gap-2 sm:flex-row'
          onSubmit={(event) => {
            event.preventDefault()
            submitChapterId()
          }}
        >
          <label htmlFor='assistant-chapter-id' className='sr-only'>
            {t('chapterPages.chapterIdLabel')}
          </label>
          <input
            id='assistant-chapter-id'
            value={draftChapterId}
            onChange={(event) => setDraftChapterId(event.target.value)}
            placeholder={t('chapterPages.chapterIdPlaceholder')}
            className='min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring'
          />
          <Button type='submit' disabled={!draftChapterId.trim() || isLoading}>
            {isLoading ? <Loader2 className='size-4 animate-spin' /> : <Search className='size-4' />}
            {t('chapterPages.open')}
          </Button>
        </form>
        <p className='mt-2 text-xs leading-5 text-muted-foreground'>{t('chapterPages.accessHint')}</p>
      </header>

      {!chapterId ? (
        <EmptyState
          title={t('chapterPages.empty.initialTitle')}
          description={t('chapterPages.empty.initialDescription')}
        />
      ) : isLoading ? (
        <div className='flex min-h-64 items-center justify-center rounded-xl border border-border bg-card'>
          <Loader2 className='size-6 animate-spin text-primary' />
          <span className='ml-2 text-sm text-muted-foreground'>{t('chapterPages.loading')}</span>
        </div>
      ) : error ? (
        <div role='alert' className='rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive'>
          <div className='flex items-start gap-2'>
            <AlertCircle className='mt-0.5 size-4 shrink-0' />
            <div>
              <p className='text-sm font-semibold'>{t('chapterPages.errors.title')}</p>
              <p className='mt-1 text-sm'>{error}</p>
            </div>
          </div>
        </div>
      ) : pages.length ? (
        <section aria-labelledby='chapter-page-grid-title'>
          <div className='mb-3 flex flex-wrap items-end justify-between gap-2'>
            <div>
              <h2 id='chapter-page-grid-title' className='text-lg font-bold text-foreground'>
                {t('chapterPages.gridTitle')}
              </h2>
              <p className='text-xs text-muted-foreground'>{t('chapterPages.pageCount', { count: pages.length })}</p>
            </div>
            <p className='max-w-xl text-right text-xs leading-5 text-muted-foreground'>
              {t('chapterPages.previewPolicy')}
            </p>
          </div>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {pages.map((page) => (
              <ChapterPageCard key={page.id} page={page} task={taskByPageId.get(page.id)} />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          title={t('chapterPages.empty.noPagesTitle')}
          description={t('chapterPages.empty.noPagesDescription')}
        />
      )}
    </div>
  )
}

function ChapterPageCard({
  page,
  task
}: {
  page: PageListResDtoOutputItemsItem
  task: TaskListResDtoOutputItemsItem | undefined
}) {
  const { t } = useTranslation('assistant')
  const signed = useTaskSignedUrl(task?.id, page.displayFile)

  return (
    <article className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
      <div className='relative aspect-[3/4] bg-muted/40'>
        {signed.status === 'ready' ? (
          <img
            src={signed.url}
            alt={t('chapterPages.pageAlt', { number: page.pageNumber })}
            className='absolute inset-0 size-full object-cover'
            loading='lazy'
          />
        ) : signed.status === 'loading' ? (
          <div className='absolute inset-0 animate-pulse bg-muted' aria-label={t('chapterPages.previewLoading')} />
        ) : (
          <div className='absolute inset-0 flex flex-col items-center justify-center gap-2 px-5 text-center'>
            <ImageIcon className='size-7 text-muted-foreground/50' />
            <p className='text-xs leading-5 text-muted-foreground'>
              {page.displayFile
                ? task
                  ? t('chapterPages.previewUnavailable')
                  : t('chapterPages.noTaskPreview')
                : t('chapterPages.noFile')}
            </p>
          </div>
        )}
        <span className='absolute left-2 top-2 rounded-full border border-border/70 bg-background/90 px-2 py-1 text-[10px] font-bold text-foreground shadow-sm backdrop-blur'>
          {t('chapterPages.pageNumber', { number: page.pageNumber })}
        </span>
      </div>
      <div className='space-y-2 p-3'>
        <div className='flex items-center justify-between gap-2'>
          <span className='text-xs font-semibold text-foreground'>{t(`chapterPages.status.${page.status}`)}</span>
          <span className='text-[10px] text-muted-foreground'>
            {t('chapterPages.revision', { revision: page.compositeRevision })}
          </span>
        </div>
        <p className='text-[11px] leading-5 text-muted-foreground'>
          {task ? t('chapterPages.taskAccess') : t('chapterPages.metadataOnly')}
        </p>
      </div>
    </article>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className='flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 text-center'>
      <BookOpen className='size-8 text-muted-foreground/40' />
      <h2 className='mt-3 text-sm font-bold text-foreground'>{title}</h2>
      <p className='mt-1 max-w-lg text-xs leading-5 text-muted-foreground'>{description}</p>
    </div>
  )
}
