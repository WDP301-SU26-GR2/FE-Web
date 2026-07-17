import { useEffect, useRef, useState } from 'react'
import { Loader2, Trash2, Undo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/ui'

export type ProposalActionDialogMode = 'delete' | 'withdraw'

type ProposalActionDialogProps = {
  mode: ProposalActionDialogMode
  open: boolean
  isSubmitting: boolean
  seriesTitle: string
  onCancel: () => void
  onConfirm: (reason?: string) => void
}

export function ProposalActionDialog({
  mode,
  open,
  isSubmitting,
  seriesTitle,
  onCancel,
  onConfirm
}: ProposalActionDialogProps) {
  const { t } = useTranslation('mangaka')
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    cancelRef.current?.focus()
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, isSubmitting, onCancel])

  if (!open) return null

  const icon = mode === 'delete' ? <Trash2 className='h-4 w-4' /> : <Undo2 className='h-4 w-4' />

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='proposal-action-dialog-title'
      className='fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4'
      onClick={() => !isSubmitting && onCancel()}
    >
      <div
        className='w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl'
        onClick={(event) => event.stopPropagation()}
      >
        <div className='space-y-4 p-5'>
          <div className='flex items-start gap-3'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive'>
              {icon}
            </div>
            <div>
              <h2 id='proposal-action-dialog-title' className='font-semibold'>
                {t(`seriesDetail.actions.${mode}.title`)}
              </h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                {t(`seriesDetail.actions.${mode}.description`, { title: seriesTitle })}
              </p>
            </div>
          </div>

          {mode === 'withdraw' && (
            <div>
              <label htmlFor='withdraw-reason' className='mb-1.5 block text-sm font-medium'>
                {t('seriesDetail.actions.withdraw.reasonLabel')}
              </label>
              <textarea
                id='withdraw-reason'
                maxLength={1000}
                rows={4}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t('seriesDetail.actions.withdraw.reasonPlaceholder')}
                className='w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring'
              />
            </div>
          )}
        </div>

        <div className='flex justify-end gap-2 border-t border-border bg-background/40 px-5 py-3'>
          <Button ref={cancelRef} type='button' variant='outline' size='sm' disabled={isSubmitting} onClick={onCancel}>
            {t('seriesDetail.actions.cancel')}
          </Button>
          <Button
            type='button'
            variant='destructive'
            size='sm'
            disabled={isSubmitting}
            onClick={() => onConfirm(reason)}
          >
            {isSubmitting && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
            {t(`seriesDetail.actions.${mode}.confirm`)}
          </Button>
        </div>
      </div>
    </div>
  )
}
