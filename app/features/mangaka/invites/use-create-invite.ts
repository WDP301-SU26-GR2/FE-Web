import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { studioControllerCreateInvite } from '~/api/operations/studio/studio'
import type { CreateInviteBodyDto, InviteResDtoOutput } from '~/api/model/studio'
import { isFetchError } from '~/api/mutator/custom-fetch'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'

type UseCreateInviteResult = {
  /** Fire POST /collaboration-invites. Returns the new invite on success, null on failure. */
  createInvite: (body: CreateInviteBodyDto) => Promise<InviteResDtoOutput | null>
  isCreating: boolean
}

/**
 * Hook for the Mangaka "Invite assistant to collaborate" action.
 *
 * Calls `POST /collaboration-invites` (orval-generated `studioControllerCreateInvite`).
 * Per FE-API-Guide-v2.md §10.1:
 *   - 422 `Error.InvalidHirePeriod` / `Error.TargetNotAssistant`
 *   - 409 `Error.DuplicateActiveCollaboration` (BE enforces we can't re-invite an
 *     assistant with an active relationship)
 *   - 404 `Error.AssistantNotFound`
 *
 * On success surfaces a translated success toast. On 409 we surface a
 * dedicated translation so the user knows it's just a duplicate, not a
 * generic failure.
 */
export function useCreateInvite(): UseCreateInviteResult {
  const { t } = useTranslation('mangaka')
  const [isCreating, setIsCreating] = useState(false)

  const createInvite = useCallback(
    async (body: CreateInviteBodyDto) => {
      if (!body.assistantId || body.taskTypes.length === 0) return null
      setIsCreating(true)
      try {
        const response = await studioControllerCreateInvite(body)
        const payload = response.data as InviteResDtoOutput
        toast.success(t('assistantDirectory.invite.success'))
        return payload
      } catch (err) {
        if (isFetchError(err) && err.status === 409) {
          toast.error(t('assistantDirectory.invite.errorDuplicate'))
          return null
        }
        if (isFetchError(err) && err.status === 422) {
          toast.error(t('assistantDirectory.invite.errorInvalidHire'))
          return null
        }
        if (isFetchError(err) && err.status === 404) {
          toast.error(t('assistantDirectory.invite.errorAssistantNotFound'))
          return null
        }
        toast.error(extractApiErrorMessage(err, t('assistantDirectory.invite.errorGeneric')))
        return null
      } finally {
        setIsCreating(false)
      }
    },
    [t]
  )

  return { createInvite, isCreating }
}