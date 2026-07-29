import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ChapterListResDtoOutputItemsItem, UpdateChapterBodyDto } from '~/api/model/chapters'
import { Button, Dialog } from '~/shared/ui'

export type EditChapterDialogProps = {
  chapter: ChapterListResDtoOutputItemsItem | null
  open: boolean
  isSubmitting: boolean
  onClose: () => void
  onConfirm: (chapterId: string, update: UpdateChapterBodyDto) => Promise<boolean>
}

/** Edit controls are rendered only for a DRAFT chapter by its parent. */
export function EditChapterDialog({ chapter, open, isSubmitting, onClose, onConfirm }: EditChapterDialogProps) {
  if (!open || !chapter) return null
  return <EditChapterDialogBody key={chapter.id} chapter={chapter} {...{ isSubmitting, onClose, onConfirm }} />
}

type EditChapterDialogBodyProps = Omit<EditChapterDialogProps, 'chapter' | 'open'> & {
  chapter: ChapterListResDtoOutputItemsItem
}

function EditChapterDialogBody({ chapter, isSubmitting, onClose, onConfirm }: EditChapterDialogBodyProps) {
  const { t } = useTranslation('mangaka')
  const [chapterNumber, setChapterNumber] = useState(String(chapter.chapterNumber))
  const [title, setTitle] = useState(chapter.title ?? '')
  const [formError, setFormError] = useState<string | null>(null)
  const canEditNumber = chapter.status === 'DRAFT'

  const update = useMemo<UpdateChapterBodyDto | null>(() => {
    const number = Number(chapterNumber)
    if (canEditNumber && (!Number.isInteger(number) || number < 1)) return null

    const next: UpdateChapterBodyDto = {}
    if (canEditNumber && number !== chapter.chapterNumber) next.chapterNumber = number
    const normalizedTitle = title.trim()
    if (normalizedTitle !== (chapter.title ?? '')) next.title = normalizedTitle
    return next
  }, [canEditNumber, chapter.chapterNumber, chapter.title, chapterNumber, title])

  const handleSubmit = async () => {
    if (isSubmitting) return
    if (!update) {
      setFormError(t('seriesDetail.publication.manage.edit.invalidNumber'))
      return
    }
    if (Object.keys(update).length === 0) {
      onClose()
      return
    }
    setFormError(null)
    if (await onConfirm(chapter.id, update)) onClose()
  }

  return (
    <Dialog
      open
      onClose={() => {
        if (!isSubmitting) onClose()
      }}
      titleId='edit-chapter-title'
      title={t('seriesDetail.publication.manage.edit.title')}
      description={t('seriesDetail.publication.manage.edit.description')}
      footer={
        <div className='flex justify-end gap-2'>
          <Button variant='outline' onClick={onClose} disabled={isSubmitting}>
            {t('seriesDetail.publication.manage.cancel')}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSubmitting || update === null}>
            {isSubmitting
              ? t('seriesDetail.publication.manage.edit.saving')
              : t('seriesDetail.publication.manage.edit.save')}
          </Button>
        </div>
      }
    >
      <div className='space-y-4'>
        <p className='text-sm text-muted-foreground'>
          {t(
            canEditNumber
              ? 'seriesDetail.publication.manage.edit.draftHint'
              : 'seriesDetail.publication.manage.edit.numberLockedHint'
          )}
        </p>
        <div className='space-y-1.5'>
          <label className='text-sm font-medium text-foreground' htmlFor='edit-chapter-number'>
            {t('seriesDetail.publication.create.chapterNumberLabel')}
          </label>
          <input
            id='edit-chapter-number'
            type='number'
            min={1}
            step={1}
            value={chapterNumber}
            onChange={(event) => setChapterNumber(event.target.value)}
            disabled={isSubmitting || !canEditNumber}
            className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60'
          />
        </div>
        <div className='space-y-1.5'>
          <label className='text-sm font-medium text-foreground' htmlFor='edit-chapter-title'>
            {t('seriesDetail.publication.create.titleLabel')}
          </label>
          <input
            id='edit-chapter-title'
            type='text'
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isSubmitting}
            className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60'
          />
        </div>
        {formError && (
          <p role='alert' className='text-sm text-destructive'>
            {formError}
          </p>
        )}
      </div>
    </Dialog>
  )
}
