import { mangakaDashboardControllerEarnings } from '~/api/operations/dashboard/dashboard'
import {
  paymentControllerGetPaymentsBySeries,
  paymentControllerGetPaymentsByUser
} from '~/api/operations/payments/payments'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { usersControllerGetMe } from '~/api/operations/users/users'
import { MangakaFinancePage, mangakaRouteMeta, resolveSelectedPaymentSeriesId } from '~/features/mangaka'

export function meta() {
  return mangakaRouteMeta('routeMeta.payments.title', 'routeMeta.payments.description')
}

export async function clientLoader({ request }: { request: Request }) {
  const requestedSeriesId = new URL(request.url).searchParams.get('series')
  try {
    const [earningsResponse, meResponse, seriesResponse] = await Promise.all([
      mangakaDashboardControllerEarnings(),
      usersControllerGetMe(),
      seriesControllerListSeries({ limit: 100 })
    ])
    if (earningsResponse.status !== 200 || meResponse.status !== 200) {
      return failedLoaderData()
    }

    const series = seriesResponse.status === 200 ? seriesResponse.data.items : []
    const filtersLoadFailed = seriesResponse.status !== 200
    const selectedSeriesId = resolveSelectedPaymentSeriesId(
      requestedSeriesId,
      series.map((item) => item.id)
    )
    try {
      const paymentsResponse = selectedSeriesId
        ? await paymentControllerGetPaymentsBySeries({ id: selectedSeriesId })
        : await paymentControllerGetPaymentsByUser({ id: meResponse.data.id })
      return {
        earnings: earningsResponse.data,
        payments: paymentsResponse.status === 200 ? paymentsResponse.data.data : [],
        earningsLoadFailed: false,
        paymentsLoadFailed: paymentsResponse.status !== 200,
        series,
        selectedSeriesId,
        filtersLoadFailed
      }
    } catch {
      return {
        earnings: earningsResponse.data,
        payments: [],
        earningsLoadFailed: false,
        paymentsLoadFailed: true,
        series,
        selectedSeriesId,
        filtersLoadFailed
      }
    }
  } catch {
    return failedLoaderData()
  }
}

function failedLoaderData() {
  return {
    earnings: null,
    payments: [],
    earningsLoadFailed: true,
    paymentsLoadFailed: true,
    series: [],
    selectedSeriesId: undefined,
    filtersLoadFailed: true
  }
}

export default function MangakaPaymentsRoute({ loaderData }: { loaderData: Awaited<ReturnType<typeof clientLoader>> }) {
  return <MangakaFinancePage {...loaderData} />
}
