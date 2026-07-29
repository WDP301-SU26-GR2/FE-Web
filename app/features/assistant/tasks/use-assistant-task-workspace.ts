import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { revisionControllerList } from '~/api/operations/revision/revision'
import { taskControllerGetTask } from '~/api/operations/task/task'
import type { RevisionRequestListResDtoOutputItemsItem } from '~/api/model/revision'
import type { TaskResDtoOutput } from '~/api/model/task'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export interface AssistantTaskWorkspace {
  task: TaskResDtoOutput | null
  revisions: RevisionRequestListResDtoOutputItemsItem[]
  isLoading: boolean
  error: string | null
  refresh: () => void
}

/** Loads workspace-only data; list responses deliberately do not include these fields. */
export function useAssistantTaskWorkspace(taskId: string | null): AssistantTaskWorkspace {
  const { t } = useTranslation('assistant')
  const [task, setTask] = useState<TaskResDtoOutput | null>(null)
  const [revisions, setRevisions] = useState<RevisionRequestListResDtoOutputItemsItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!taskId) {
      queueMicrotask(() => {
        setTask(null)
        setRevisions([])
        setError(null)
      })
      return
    }

    const controller = new AbortController()
    void (async () => {
      setIsLoading(true)
      setError(null)
      try {
        const taskResponse = await taskControllerGetTask({ id: taskId }, { signal: controller.signal })
        if (controller.signal.aborted) return
        const rawTask = taskResponse.data
        // Old task records can predate relation hydration. Normalize those
        // optional arrays at the API boundary so cards/dialogs never call
        // .map/.filter on undefined after a backend schema deployment.
        const loadedTask = {
          ...rawTask,
          regionIds: Array.isArray(rawTask.regionIds) ? rawTask.regionIds : [],
          assetIds: Array.isArray(rawTask.assetIds) ? rawTask.assetIds : [],
          versions: Array.isArray(rawTask.versions) ? rawTask.versions : [],
          assets: Array.isArray(rawTask.assets) ? rawTask.assets : [],
          regions: Array.isArray(rawTask.regions) ? rawTask.regions : []
        }
        setTask(loadedTask)

        const [taskRevisions] = await Promise.allSettled([
          revisionControllerList({ targetType: 'TASK', targetId: taskId, limit: 100 }, { signal: controller.signal })
        ])
        if (controller.signal.aborted) return

        setRevisions(
          taskRevisions.status === 'fulfilled' && taskRevisions.value.status === 200
            ? (taskRevisions.value.data.items ?? [])
            : []
        )
      } catch (err) {
        if (!controller.signal.aborted) setError(extractApiErrorMessage(err, t('tasks.workspace.loadFailed')))
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [reloadToken, t, taskId])

  const refresh = useCallback(() => setReloadToken((value) => value + 1), [])
  return { task, revisions, isLoading, error, refresh }
}
