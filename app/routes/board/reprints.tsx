import {
  reprintRequestControllerBoardApprove,
  reprintRequestControllerFindAll,
  reprintRequestControllerFindById
} from '~/api/operations/reprint-requests/reprint-requests'
import { BoardReprintsPage, type BoardActionResult } from '~/features/board'
import type { Route } from './+types/reprints'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const searchParams = new URL(request.url).searchParams
  const requestId = searchParams.get('requestId')?.trim() ?? ''
  const seriesId = searchParams.get('seriesId')?.trim() ?? ''
  if (requestId) {
    try {
      const response = await reprintRequestControllerFindById({ id: requestId })
      if (response.status !== 200) throw new Response('Not found', { status: response.status })
      return { requests: [response.data], hasError: false, seriesId: response.data.seriesId }
    } catch {
      return { requests: [], hasError: true, seriesId: '' }
    }
  }
  try {
    const response = await reprintRequestControllerFindAll({
      status: undefined as unknown as string,
      seriesId: seriesId || (undefined as unknown as string)
    })
    return { requests: response.data, hasError: false, seriesId }
  } catch {
    return { requests: [], hasError: true, seriesId }
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
    } else return { ok: false, intent }
    return { ok: true, intent }
  } catch {
    return { ok: false, intent }
  }
}

function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '')
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardReprintsPage {...loaderData} />
}
