import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  seriesControllerDeleteProposal,
  seriesControllerResubmitProposal,
  seriesControllerWithdraw
} from '~/api/operations/series/series'
import { nameControllerResubmit } from '~/api/operations/names/names'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

type ProposalAction = 'delete' | 'withdraw' | 'resubmitProposal' | 'resubmitName'

type UseProposalActionsResult = {
  activeAction: ProposalAction | null
  deleteDraft: (seriesId: string) => Promise<boolean>
  withdraw: (seriesId: string, reason?: string) => Promise<boolean>
  resubmitProposal: (seriesId: string) => Promise<boolean>
  resubmitName: (seriesId: string, nameId: string) => Promise<boolean>
}

export function useProposalActions(): UseProposalActionsResult {
  const { t } = useTranslation('mangaka')
  const [activeAction, setActiveAction] = useState<ProposalAction | null>(null)

  const run = useCallback(
    async (action: ProposalAction, request: () => Promise<unknown>) => {
      setActiveAction(action)
      try {
        await request()
        toast.success(t(`seriesDetail.actions.${action}.success`))
        return true
      } catch (error) {
        const extracted = extractApiErrorMessage(error, '')
        const message = extracted.startsWith('Error.')
          ? t(`seriesDetail.actions.errors.${extracted.slice('Error.'.length)}`, {
              defaultValue: t('seriesDetail.actions.errorGeneric')
            })
          : extracted || t('seriesDetail.actions.errorGeneric')
        toast.error(message)
        return false
      } finally {
        setActiveAction(null)
      }
    },
    [t]
  )

  const deleteDraft = useCallback(
    (seriesId: string) => run('delete', () => seriesControllerDeleteProposal({ id: seriesId })),
    [run]
  )

  const withdraw = useCallback(
    (seriesId: string, reason?: string) =>
      run('withdraw', () => seriesControllerWithdraw({ id: seriesId }, { reason: reason?.trim() || undefined })),
    [run]
  )

  const resubmitProposal = useCallback(
    (seriesId: string) => run('resubmitProposal', () => seriesControllerResubmitProposal({ id: seriesId })),
    [run]
  )

  const resubmitName = useCallback(
    (seriesId: string, nameId: string) => run('resubmitName', () => nameControllerResubmit({ id: seriesId, nameId })),
    [run]
  )

  return { activeAction, deleteDraft, withdraw, resubmitProposal, resubmitName }
}
