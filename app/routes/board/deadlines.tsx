import {
  deadlineControllerBoardResolve,
  deadlineControllerList
} from '~/api/operations/deadline-requests/deadline-requests'
import { BoardDeadlinesPage, type BoardActionResult } from '~/features/board'
import type { Route } from './+types/deadlines'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const chapterId = new URL(request.url).searchParams.get('chapterId') ?? ''
  if (!chapterId) return { requests: [], chapterId, hasError: false }
  try {
    const [review, escalated] = await Promise.all([
      deadlineControllerList({ chapterId, status: 'BOARD_REVIEW' }),
      deadlineControllerList({ chapterId, status: 'ESCALATED' })
    ])
    return {
      requests: [
        ...(review.status === 200 ? review.data.items : []),
        ...(escalated.status === 200 ? escalated.data.items : [])
      ],
      chapterId,
      hasError: review.status !== 200 || escalated.status !== 200
    }
  } catch {
    return { requests: [], chapterId, hasError: true }
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
