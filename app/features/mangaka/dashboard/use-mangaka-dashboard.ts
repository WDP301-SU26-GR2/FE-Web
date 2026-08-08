import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MangakaDashboardResDtoOutputStudioItem } from '~/api/model/dashboard'
import { mangakaDashboardControllerMangaka } from '~/api/operations/dashboard/dashboard'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export interface MangakaDashboardData {
  studio: MangakaDashboardResDtoOutputStudioItem[]
  unreadNotifications: number
  openRevisionRequests: number
}

export interface UseMangakaDashboardReturn {
  data: MangakaDashboardData | null
  loading: boolean
  error: string | null
  reload: () => void
}

export function useMangakaDashboard(): UseMangakaDashboardReturn {
  const { t } = useTranslation('mangaka')
  const [data, setData] = useState<MangakaDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await mangakaDashboardControllerMangaka()
      // res.data contains MangakaDashboardResDtoOutput
      setData({
        studio: res.data?.studio ?? [],
        unreadNotifications: res.data?.unreadNotifications ?? 0,
        openRevisionRequests: res.data?.openRevisionRequests ?? 0
      })
    } catch (err) {
      setError(extractApiErrorMessage(err, t('dashboard.loadError')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial API synchronization
    void fetchData()
  }, [fetchData])

  return { data, loading, error, reload: fetchData }
}
