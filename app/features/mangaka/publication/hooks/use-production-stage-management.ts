import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  productionStageControllerAdd,
  productionStageControllerPatch,
  productionStageControllerRemove
} from '~/api/operations/production-stages/production-stages'
import type { CreateStageBodyDto, UpdateStageBodyDto } from '~/api/model/production-stages'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export type CreateProductionStageInput = Pick<CreateStageBodyDto, 'name' | 'taskTypes' | 'afterStageId'>
export type UpdateProductionStageInput = Pick<UpdateStageBodyDto, 'name' | 'deadline'>

export interface ProductionStageManagement {
  add: (input: CreateProductionStageInput) => Promise<boolean>
  update: (stageId: string, input: UpdateProductionStageInput) => Promise<boolean>
  remove: (stageId: string) => Promise<boolean>
  isMutating: boolean
}

/** Mutations for the small editable portion of a chapter's production sequence. */
export function useProductionStageManagement(chapterId: string, onChanged: () => void): ProductionStageManagement {
  const { t } = useTranslation('mangaka')
  const [isMutating, setIsMutating] = useState(false)

  const run = useCallback(
    async (operation: () => Promise<unknown>, successKey: string) => {
      setIsMutating(true)
      try {
        await operation()
        toast.success(t(successKey))
        onChanged()
        return true
      } catch (cause) {
        toast.error(extractApiErrorMessage(cause, t('seriesDetail.production.management.error')))
        return false
      } finally {
        setIsMutating(false)
      }
    },
    [onChanged, t]
  )

  const add = useCallback(
    (input: CreateProductionStageInput) =>
      run(() => productionStageControllerAdd({ id: chapterId }, input), 'seriesDetail.production.management.created'),
    [chapterId, run]
  )

  const update = useCallback(
    (stageId: string, input: UpdateProductionStageInput) =>
      run(
        () => productionStageControllerPatch({ id: chapterId, stageId }, input),
        'seriesDetail.production.management.updated'
      ),
    [chapterId, run]
  )

  const remove = useCallback(
    (stageId: string) =>
      run(
        () => productionStageControllerRemove({ id: chapterId, stageId }),
        'seriesDetail.production.management.removed'
      ),
    [chapterId, run]
  )

  return { add, update, remove, isMutating }
}
