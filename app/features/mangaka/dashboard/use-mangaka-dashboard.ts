import { useCallback, useEffect, useState } from 'react'
import type {
  MangakaDashboardResDtoOutput,
  MangakaDashboardResDtoOutputRankingsItem,
  MangakaDashboardResDtoOutputStudioItem
} from '~/api/model/dashboard'
import { dashboardControllerMangaka } from '~/api/operations/dashboard/dashboard'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'

export interface MangakaDashboardData {
  studio: MangakaDashboardResDtoOutputStudioItem[]
  rankings: MangakaDashboardResDtoOutputRankingsItem[]
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
  const [data, setData] = useState<MangakaDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await dashboardControllerMangaka()
      // res.data contains MangakaDashboardResDtoOutput
      setData({
        studio: res.data?.studio ?? [],
        rankings: res.data?.rankings ?? [],
        unreadNotifications: res.data?.unreadNotifications ?? 0,
        openRevisionRequests: res.data?.openRevisionRequests ?? 0
      })
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Không tải được dashboard'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return { data, loading, error, reload: fetchData }
}
