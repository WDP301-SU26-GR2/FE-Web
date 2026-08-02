import {
  reprintRequestControllerBoardApprove,
  reprintRequestControllerAssignReviser,
  reprintRequestControllerFindAll,
  reprintRequestControllerFindById
} from '~/api/operations/reprint-requests/reprint-requests'
import { AssignReviserBodyDtoReviserType, ReprintRequestResDtoOutputStatus } from '~/api/model/reprint-requests'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { contractControllerGetContracts } from '~/api/operations/contracts/contracts'
import { usersControllerListMangakas } from '~/api/operations/users/users'
import { BoardReprintsPage, type BoardActionResult } from '~/features/board'
import type { Route } from './+types/reprints'
import { extractApiErrorCode, extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { isEnumValue } from '~/shared/lib/is-enum-value'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const searchParams = new URL(request.url).searchParams
  const requestId = searchParams.get('requestId')?.trim() ?? ''
  const seriesId = searchParams.get('seriesId')?.trim() ?? ''
  const requestedStatus = searchParams.get('status') ?? ''
  const status = isEnumValue(ReprintRequestResDtoOutputStatus, requestedStatus)
    ? requestedStatus
    : ReprintRequestResDtoOutputStatus.PENDING
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
        seriesId: response.data.seriesId,
        status: response.data.status
      }
    } catch {
      return { requests: [], series: [], contractTypes: {}, mangakas: [], hasError: true, seriesId: '', status }
    }
  }
  try {
    const [response, seriesResponse, contractsResponse, mangakasResponse] = await Promise.all([
      seriesId ? reprintRequestControllerFindAll({ status, seriesId }) : Promise.resolve(null),
      seriesControllerListSeries({ limit: 100, offset: 0 }),
      contractControllerGetContracts(),
      usersControllerListMangakas({ limit: 100, offset: 0 })
    ])
    const requests = await Promise.all(
      (response?.data ?? []).map((item) =>
        reprintRequestControllerFindById({ id: item.id })
          .then((detail) => detail.data)
          .catch(() => null)
      )
    )
    return {
      requests: requests.filter((item) => item !== null),
      series: seriesResponse.data.items,
      contractTypes: activeContractTypes(contractsResponse.data),
      mangakas: mangakasResponse.data.items,
      hasError: false,
      seriesId,
      status
    }
  } catch {
    return { requests: [], series: [], contractTypes: {}, mangakas: [], hasError: true, seriesId, status }
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
      const reviserType = required(form, 'reviserType')
      if (!isEnumValue(AssignReviserBodyDtoReviserType, reviserType)) return { ok: false, intent }
      await reprintRequestControllerAssignReviser(
        { id: required(form, 'requestId'), chapterId: required(form, 'chapterId') },
        {
          reviserId: required(form, 'reviserId'),
          reviserType
        }
      )
    } else return { ok: false, intent }
    return {
      ok: true,
      intent,
      messageKey:
        intent === 'assignReviser' ? 'reviserAssigned' : intent === 'approve' ? 'reprintApproved' : 'reprintRejected'
    }
  } catch (error) {
    return {
      ok: false,
      intent,
      errorCode: extractApiErrorCode(error),
      message: extractApiErrorMessage(error, 'Không thể hoàn tất thao tác tái bản.')
    }
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
