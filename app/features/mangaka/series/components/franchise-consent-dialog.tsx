import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/ui'
import { Dialog } from '~/shared/ui/dialog'

type FranchiseConsentDialogProps = {
  open: boolean
  seriesTitle: string
  approve: boolean
  isSubmitting: boolean
  error?: string
  onClose: () => void
  onConfirm: () => Promise<void>
}

/** Confirmation boundary for an original Mangaka's irreversible franchise decision. */
export function FranchiseConsentDialog({
  open,
  seriesTitle,
  approve,
  isSubmitting,
  error,
  onClose,
  onConfirm
}: FranchiseConsentDialogProps) {
  const { t } = useTranslation('mangaka')
  const decisionKey = approve ? 'approve' : 'reject'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId='franchise-consent-dialog-title'
      descriptionId='franchise-consent-dialog-description'
      title={t(`seriesDetail.lifecycle.franchise.${decisionKey}DialogTitle`)}
      description={t(`seriesDetail.lifecycle.franchise.${decisionKey}DialogDescription`, { title: seriesTitle })}
      footer={
        <div className='flex justify-end gap-2'>
          <Button type='button' variant='outline' size='sm' disabled={isSubmitting} onClick={onClose}>
            {t('seriesDetail.lifecycle.franchise.cancel')}
          </Button>
          <Button
            type='button'
            variant={approve ? 'primary' : 'destructive'}
            size='sm'
            disabled={isSubmitting}
            onClick={() => void onConfirm()}
          >
            {isSubmitting
              ? t('seriesDetail.lifecycle.franchise.submitting')
              : t(`seriesDetail.lifecycle.franchise.${decisionKey}`)}
          </Button>
        </div>
      }
    >
      <p className='rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground'>
        {t('seriesDetail.lifecycle.franchise.decisionHint')}
      </p>
      {error && (
        <p
          role='alert'
          className='mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive'
        >
          {error}
        </p>
      )}
    </Dialog>
  )
}
