import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/ui'
import { Dialog } from '~/shared/ui/dialog'

export type CompletionProposalInput = {
  reason: string
  proposedEndingChapters?: number
}

type CompletionProposalDialogProps = {
  open: boolean
  seriesTitle: string
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (input: CompletionProposalInput) => void
}

/** Collects the Mangaka's Flow 5 request for a natural series completion. */
export function CompletionProposalDialog({
  open,
  seriesTitle,
  isSubmitting,
  onClose,
  onSubmit
}: CompletionProposalDialogProps) {
  const { t } = useTranslation('mangaka')
  const [reason, setReason] = useState('')
  const [endingChapters, setEndingChapters] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedReason = reason.trim()
    const parsedEndingChapters = endingChapters.trim() ? Number(endingChapters) : undefined

    if (!trimmedReason) {
      setFormError(t('seriesDetail.lifecycle.completion.reasonRequired'))
      return
    }
    if (
      parsedEndingChapters !== undefined &&
      (!Number.isInteger(parsedEndingChapters) || parsedEndingChapters < 1)
    ) {
      setFormError(t('seriesDetail.lifecycle.completion.endingChaptersInvalid'))
      return
    }

    setFormError(null)
    onSubmit({ reason: trimmedReason, proposedEndingChapters: parsedEndingChapters })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId='completion-proposal-dialog-title'
      descriptionId='completion-proposal-dialog-description'
      title={t('seriesDetail.lifecycle.completion.dialogTitle')}
      description={t('seriesDetail.lifecycle.completion.dialogDescription', { title: seriesTitle })}
      footer={
        <div className='flex justify-end gap-2'>
          <Button type='button' variant='outline' size='sm' disabled={isSubmitting} onClick={onClose}>
            {t('seriesDetail.lifecycle.completion.cancel')}
          </Button>
          <Button type='submit' form='completion-proposal-form' variant='primary' size='sm' disabled={isSubmitting}>
            {isSubmitting ? t('seriesDetail.lifecycle.completion.submitting') : t('seriesDetail.lifecycle.completion.confirm')}
          </Button>
        </div>
      }
    >
      <form id='completion-proposal-form' className='space-y-4' onSubmit={handleSubmit}>
        <p className='rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground'>
          {t('seriesDetail.lifecycle.completion.flowHint')}
        </p>
        <div>
          <label htmlFor='completion-reason' className='mb-1.5 block text-sm font-medium text-foreground'>
            {t('seriesDetail.lifecycle.completion.reasonLabel')}
          </label>
          <textarea
            id='completion-reason'
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={isSubmitting}
            maxLength={1000}
            required
            rows={4}
            placeholder={t('seriesDetail.lifecycle.completion.reasonPlaceholder')}
            className='w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60'
          />
        </div>
        <div>
          <label htmlFor='completion-ending-chapters' className='mb-1.5 block text-sm font-medium text-foreground'>
            {t('seriesDetail.lifecycle.completion.endingChaptersLabel')}
          </label>
          <input
            id='completion-ending-chapters'
            type='number'
            min={1}
            step={1}
            value={endingChapters}
            onChange={(event) => setEndingChapters(event.target.value)}
            disabled={isSubmitting}
            placeholder={t('seriesDetail.lifecycle.completion.endingChaptersPlaceholder')}
            className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60'
          />
          <p className='mt-1.5 text-xs text-muted-foreground'>
            {t('seriesDetail.lifecycle.completion.endingChaptersHint')}
          </p>
        </div>
        {formError && <p className='text-sm text-destructive'>{formError}</p>}
      </form>
    </Dialog>
  )
}
