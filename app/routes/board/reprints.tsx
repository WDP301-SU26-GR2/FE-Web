import {
  reprintRequestControllerBoardApprove,
  reprintRequestControllerCreate,
  reprintRequestControllerFindAll
} from '~/api/operations/reprint-requests/reprint-requests'
import { BoardReprintsPage, type BoardActionResult } from '~/features/board'
import type { Route } from './+types/reprints'

export async function clientLoader() {
  try {
    const response = await reprintRequestControllerFindAll({ status: '', seriesId: '' })
    return { requests: response.data, hasError: false }
  } catch {
    return { requests: [], hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<BoardActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'create') {
      await reprintRequestControllerCreate({
        seriesId: required(form, 'seriesId'),
        revisionMode: required(form, 'revisionMode') as 'AS_IS' | 'WITH_REVISION',
        reason: required(form, 'reason'),
        chapterRangeStart: Number(required(form, 'chapterRangeStart')),
        chapterRangeEnd: Number(required(form, 'chapterRangeEnd'))
      })
    } else if (intent === 'approve' || intent === 'reject') {
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
