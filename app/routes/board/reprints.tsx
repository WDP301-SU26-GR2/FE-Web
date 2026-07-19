import {
  reprintRequestControllerBoardApprove,
  reprintRequestControllerAssignReviser,
  reprintRequestControllerFindAll,
  reprintRequestControllerFindById
} from '~/api/operations/reprint-requests/reprint-requests'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { contractControllerGetContracts } from '~/api/operations/contracts/contracts'
import { usersControllerListMangakas } from '~/api/operations/users/users'
import { BoardReprintsPage, type BoardActionResult } from '~/features/board'
import type { Route } from './+types/reprints'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const searchParams = new URL(request.url).searchParams
  const requestId = searchParams.get('requestId')?.trim() ?? ''
  const seriesId = searchParams.get('seriesId')?.trim() ?? ''
  if (requestId) {
    try {
      const [response, seriesResponse, contractsResponse, mangakasResponse] = await Promise.all([
        reprintRequestControllerFindById({ id: requestId }),
        seriesControllerListSeries({ limit: 100, offset: 0 }),
        contractControllerGetContracts(),
        usersControllerListMangakas({ limit: 100, offset: 0 })
      ])
      if (response.status !== 200) throw new Response('Not found', { status: response.status })
      return {
        requests: [response.data],
        series: seriesResponse.data.items,
        contractTypes: activeContractTypes(contractsResponse.data),
        mangakas: mangakasResponse.data.items,
        hasError: false,
        seriesId: response.data.seriesId
      }
    } catch {
      return { requests: [], series: [], contractTypes: {}, mangakas: [], hasError: true, seriesId: '' }
    }
  }
  try {
    const [response, seriesResponse, contractsResponse, mangakasResponse] = await Promise.all([
      reprintRequestControllerFindAll({
        status: undefined as unknown as string,
        seriesId: seriesId || (undefined as unknown as string)
      }),
      seriesControllerListSeries({ limit: 100, offset: 0 }),
      contractControllerGetContracts(),
      usersControllerListMangakas({ limit: 100, offset: 0 })
    ])
    return {
      requests: response.data,
      series: seriesResponse.data.items,
      contractTypes: activeContractTypes(contractsResponse.data),
      mangakas: mangakasResponse.data.items,
      hasError: false,
      seriesId
    }
  } catch {
    return { requests: [], series: [], contractTypes: {}, mangakas: [], hasError: true, seriesId }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<BoardActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'approve' || intent === 'reject') {
      await reprintRequestControllerBoardApprove(
        { id: required(form, 'requestId') },
        { approve: intent === 'approve', reason: String(form.get('reason') ?? '') || undefined }
      )
    } else if (intent === 'assignReviser') {
      await reprintRequestControllerAssignReviser(
        { id: required(form, 'requestId'), chapterId: required(form, 'chapterId') },
        {
          reviserId: required(form, 'reviserId'),
          reviserType: required(form, 'reviserType') as 'INTERNAL_TEAM' | 'OTHER_MANGAKA'
        }
      )
    } else return { ok: false, intent }
    return { ok: true, intent }
  } catch (error) {
    return { ok: false, intent, message: extractApiErrorMessage(error, 'Không thể hoàn tất thao tác tái bản.') }
  }
}

function activeContractTypes(contracts: Awaited<ReturnType<typeof contractControllerGetContracts>>['data']) {
  return Object.fromEntries(
    contracts
      .filter((contract) => contract.status === 'FULLY_EXECUTED')
      .map((contract) => [contract.seriesId, contract.contractType])
  )
}

function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '')
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardReprintsPage {...loaderData} />
}
