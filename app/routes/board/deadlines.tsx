import {
  deadlineControllerBoardResolve,
  deadlineControllerGetOne,
  deadlineControllerList
} from '~/api/operations/deadline-requests/deadline-requests'
import { chapterControllerListBySeries } from '~/api/operations/chapters/chapters'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { BoardDeadlinesPage, type BoardActionResult } from '~/features/board'
import type { Route } from './+types/deadlines'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const searchParams = new URL(request.url).searchParams
  const requestId = searchParams.get('requestId') ?? ''
  const requestedChapterId = searchParams.get('chapterId') ?? ''
  const requestedSeriesId = searchParams.get('seriesId') ?? ''
  try {
    const focusedRequest = requestId ? await deadlineControllerGetOne({ id: requestId }) : null
    const focusedDeadline = focusedRequest?.status === 200 ? focusedRequest.data : undefined
    const seriesId = requestedSeriesId || focusedDeadline?.seriesId || ''
    const chapterId = requestedChapterId || focusedDeadline?.chapterId || ''
    const [seriesResponse, chaptersResponse, review, escalated] = await Promise.all([
      seriesControllerListSeries({ limit: 100, offset: 0 }),
      seriesId ? chapterControllerListBySeries({ seriesId }) : null,
      chapterId ? deadlineControllerList({ chapterId, status: 'BOARD_REVIEW' }) : null,
      chapterId ? deadlineControllerList({ chapterId, status: 'ESCALATED' }) : null
    ])
    return {
      requests: [
        ...(review?.status === 200 ? review.data.items : []),
        ...(escalated?.status === 200 ? escalated.data.items : [])
      ],
      series: seriesResponse.data.items,
      chapters: chaptersResponse?.status === 200 ? chaptersResponse.data.items : [],
      seriesId,
      chapterId,
      hasError: Boolean(chapterId && (review?.status !== 200 || escalated?.status !== 200))
    }
  } catch {
    return { requests: [], series: [], chapters: [], seriesId: requestedSeriesId, chapterId: requestedChapterId, hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<BoardActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent !== 'approve' && intent !== 'reject') return { ok: false, intent }
    await deadlineControllerBoardResolve(
      { id: required(form, 'requestId') },
      { decision: intent === 'approve' ? 'APPROVE' : 'REJECT', note: String(form.get('note') ?? '') || null }
    )
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
  return <BoardDeadlinesPage {...loaderData} />
}
