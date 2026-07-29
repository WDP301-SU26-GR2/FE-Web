import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ChapterListResDtoOutputItemsItem } from '~/api/model/chapters'
import { Button, Dialog } from '~/shared/ui'

export type DeleteChapterDialogProps = {
  chapter: ChapterListResDtoOutputItemsItem | null
  open: boolean
  isSubmitting: boolean
  onClose: () => void
  onConfirm: (chapterId: string) => Promise<boolean>
}

/** A typed confirmation makes the destructive draft cascade intentional. */
export function DeleteChapterDialog({ chapter, open, isSubmitting, onClose, onConfirm }: DeleteChapterDialogProps) {
  if (!open || !chapter) return null
  // The body is mounted only while open. Its key makes a fresh confirmation
  // field for each chapter and every subsequent dialog opening without a
  // synchronous state reset in an effect.
  return (
    <DeleteChapterDialogBody
      key={chapter.id}
      chapter={chapter}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}

type DeleteChapterDialogBodyProps = Omit<DeleteChapterDialogProps, 'chapter' | 'open'> & {
  chapter: ChapterListResDtoOutputItemsItem
}

function DeleteChapterDialogBody({ chapter, isSubmitting, onClose, onConfirm }: DeleteChapterDialogBodyProps) {
  const { t } = useTranslation('mangaka')
  const [confirmation, setConfirmation] = useState('')
  const confirmationWord = t('seriesDetail.publication.manage.delete.confirmationWord')
  const canDelete = confirmation === confirmationWord && !isSubmitting

  return (
    <Dialog
      open
      onClose={() => {
        if (!isSubmitting) onClose()
      }}
      titleId='delete-chapter-title'
      title={t('seriesDetail.publication.manage.delete.title')}
      description={t('seriesDetail.publication.manage.delete.description', { number: chapter.chapterNumber })}
      footer={
        <div className='flex justify-end gap-2'>
          <Button variant='outline' onClick={onClose} disabled={isSubmitting}>
            {t('seriesDetail.publication.manage.cancel')}
          </Button>
          <Button
            variant='destructive'
            disabled={!canDelete}
            onClick={() => void onConfirm(chapter.id).then((ok) => ok && onClose())}
          >
            {isSubmitting
              ? t('seriesDetail.publication.manage.delete.deleting')
              : t('seriesDetail.publication.manage.delete.confirm')}
          </Button>
        </div>
      }
    >
      <div className='space-y-4'>
        <p className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
          {t('seriesDetail.publication.manage.delete.warning')}
        </p>
        <div className='space-y-1.5'>
          <label className='text-sm font-medium text-foreground' htmlFor='delete-chapter-confirmation'>
            {t('seriesDetail.publication.manage.delete.confirmationLabel', { word: confirmationWord })}
          </label>
          <input
            id='delete-chapter-confirmation'
            type='text'
            autoComplete='off'
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={isSubmitting}
            className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60'
          />
        </div>
      </div>
    </Dialog>
  )
}
