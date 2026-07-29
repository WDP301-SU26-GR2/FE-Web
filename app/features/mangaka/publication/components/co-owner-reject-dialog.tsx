import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/ui'
import { Dialog } from '~/shared/ui/dialog'

export type CoOwnerRejectDialogProps = {
  open: boolean
  isSubmitting: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

/** Confirmation dialog for returning a co-owned manuscript to Editor revision. */
export function CoOwnerRejectDialog({ open, isSubmitting, onClose, onConfirm }: CoOwnerRejectDialogProps) {
  const { t } = useTranslation('mangaka')
  const [reason, setReason] = useState('')

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isSubmitting) onClose()
      }}
      titleId='co-owner-reject-dialog-title'
      descriptionId='co-owner-reject-dialog-description'
      title={t('publication.manuscript.coOwner.rejectDialog.title')}
      description={t('publication.manuscript.coOwner.rejectDialog.description')}
      size='sm'
      footer={
        <div className='flex justify-end gap-2'>
          <Button size='sm' variant='ghost' disabled={isSubmitting} onClick={onClose}>
            {t('publication.cancel')}
          </Button>
          <Button size='sm' variant='destructive' disabled={isSubmitting} onClick={() => onConfirm(reason)}>
            {isSubmitting
              ? t('publication.manuscript.coOwner.rejectDialog.submitting')
              : t('publication.manuscript.coOwner.actions.reject.button')}
          </Button>
        </div>
      }
    >
      <div className='space-y-3'>
        <p className='text-sm text-foreground'>{t('publication.manuscript.coOwner.rejectDialog.notice')}</p>
        <label htmlFor='co-owner-reject-reason' className='block text-sm font-medium text-foreground'>
          {t('publication.manuscript.coOwner.rejectDialog.reasonLabel')}
          <span className='ml-1 text-xs font-normal text-muted-foreground'>
            {t('publication.manuscript.coOwner.rejectDialog.reasonOptional')}
          </span>
          <textarea
            id='co-owner-reject-reason'
            value={reason}
            maxLength={1000}
            rows={4}
            autoFocus
            disabled={isSubmitting}
            onChange={(event) => setReason(event.target.value)}
            aria-describedby='co-owner-reject-reason-count'
            className='mt-1.5 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60'
          />
        </label>
        <p id='co-owner-reject-reason-count' className='text-right text-xs text-muted-foreground'>
          {t('publication.manuscript.coOwner.rejectDialog.characterCount', { count: reason.length })}
        </p>
      </div>
    </Dialog>
  )
}
