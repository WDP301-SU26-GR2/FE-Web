import { useLoaderData, type ClientLoaderFunctionArgs } from 'react-router'
import { seriesControllerGetSeries, seriesControllerListSeries } from '~/api/operations/series/series'
import { surveyControllerGetSeriesTrend } from '~/api/operations/survey/survey'
import { tankobonControllerDashboard } from '~/api/operations/tankobon/tankobon'
import { AdminReferenceSeriesPage } from '~/features/admin'
import { loadAllOffsetItems } from '~/shared/lib/api/load-all-offset-items'

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const search = new URL(request.url).searchParams
  const seriesId = clean(search.get('seriesId'))
  const seriesNameId = clean(search.get('seriesNameId'))
  const returnTo = safeReturnTo(search.get('returnTo'))
  const series = await loadAllOffsetItems((pagination) =>
    seriesControllerListSeries(pagination).then((response) => response.data)
  )

  const [detail, defense, rankingTrend] = seriesId
    ? await Promise.all([
        settle(seriesControllerGetSeries({ id: seriesId })),
        settle(tankobonControllerDashboard({ id: seriesId })),
        settle(surveyControllerGetSeriesTrend({ seriesId, periods: 12 }))
      ])
    : [null, null, null]

  return {
    series,
    selected: { seriesId, seriesNameId, returnTo },
    seriesData: { detail, defense, rankingTrend }
  }
}

async function settle<T>(promise: Promise<{ data: T } | { data: void }>): Promise<T | null> {
  try {
    const data = (await promise).data
    return data === undefined ? null : (data as T)
  } catch {
    return null
  }
}

function clean(value: string | null) {
  return value?.trim() ?? ''
}

function safeReturnTo(value: string | null) {
  const target = clean(value)
  return target.startsWith('/dashboard/admin') ? target : '/dashboard/admin/operations/reference'
}

export default function RouteComponent() {
  const loaderData = useLoaderData<typeof clientLoader>()
  return <AdminReferenceSeriesPage {...loaderData} />
}
