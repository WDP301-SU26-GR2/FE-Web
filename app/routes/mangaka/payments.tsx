import { mangakaDashboardControllerEarnings } from '~/api/operations/dashboard/dashboard'
import { contractControllerGetContracts } from '~/api/operations/contracts/contracts'
import {
  paymentControllerGetPaymentsByContract,
  paymentControllerGetPaymentsBySeries,
  paymentControllerGetPaymentsByUser
} from '~/api/operations/payments/payments'
import { usersControllerGetMe } from '~/api/operations/users/users'
import type { ContractListItemDtoOutput } from '~/api/model/contracts'
import { MangakaFinancePage, mangakaRouteMeta } from '~/features/mangaka'

export function meta() {
  return mangakaRouteMeta('routeMeta.payments.title', 'routeMeta.payments.description')
}

export async function clientLoader({ request }: { request: Request }) {
  const requestedView = new URL(request.url).searchParams.get('view') ?? 'user'
  try {
    const [earningsResponse, meResponse] = await Promise.all([
      mangakaDashboardControllerEarnings(),
      usersControllerGetMe()
    ])
    if (earningsResponse.status !== 200 || meResponse.status !== 200) {
      return failedLoaderData()
    }

    let contracts: ContractListItemDtoOutput[] = []
    let filtersLoadFailed = false
    try {
      const contractsResponse = await contractControllerGetContracts()
      contracts = contractsResponse.status === 200 ? contractsResponse.data : []
      filtersLoadFailed = contractsResponse.status !== 200
    } catch {
      filtersLoadFailed = true
    }

    const paymentView = resolvePaymentView(requestedView, contracts)
    try {
      const paymentsResponse =
        paymentView.scope === 'contract'
          ? await paymentControllerGetPaymentsByContract({ id: paymentView.id })
          : paymentView.scope === 'series'
            ? await paymentControllerGetPaymentsBySeries({ id: paymentView.id })
            : await paymentControllerGetPaymentsByUser({ id: meResponse.data.id })
      return {
        earnings: earningsResponse.data,
        payments: paymentsResponse.status === 200 ? paymentsResponse.data.data : [],
        earningsLoadFailed: false,
        paymentsLoadFailed: paymentsResponse.status !== 200,
        contracts,
        selectedView: paymentView.value,
        filtersLoadFailed
      }
    } catch {
      return {
        earnings: earningsResponse.data,
        payments: [],
        earningsLoadFailed: false,
        paymentsLoadFailed: true,
        contracts,
        selectedView: paymentView.value,
        filtersLoadFailed
      }
    }
  } catch {
    return failedLoaderData()
  }
}

function resolvePaymentView(requestedView: string, contracts: ContractListItemDtoOutput[]) {
  const separator = requestedView.indexOf(':')
  const scope = separator > 0 ? requestedView.slice(0, separator) : requestedView
  const id = separator > 0 ? requestedView.slice(separator + 1) : ''

  if (scope === 'contract' && contracts.some((contract) => contract.id === id)) {
    return { scope: 'contract' as const, id, value: `contract:${id}` }
  }
  if (scope === 'series' && contracts.some((contract) => contract.seriesId === id)) {
    return { scope: 'series' as const, id, value: `series:${id}` }
  }
  return { scope: 'user' as const, id: '', value: 'user' }
}

function failedLoaderData() {
  return {
    earnings: null,
    payments: [],
    earningsLoadFailed: true,
    paymentsLoadFailed: true,
    contracts: [] as ContractListItemDtoOutput[],
    selectedView: 'user',
    filtersLoadFailed: true
  }
}

export default function MangakaPaymentsRoute({ loaderData }: { loaderData: Awaited<ReturnType<typeof clientLoader>> }) {
  return <MangakaFinancePage {...loaderData} />
}
