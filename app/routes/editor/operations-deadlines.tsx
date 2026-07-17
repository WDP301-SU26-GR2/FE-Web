import {
  deadlineControllerAgree,
  deadlineControllerCounter,
  deadlineControllerCreate,
  deadlineControllerFinalize,
  deadlineControllerList,
  deadlineControllerReject,
  deadlineControllerWithdraw
} from '~/api/operations/deadline-requests/deadline-requests'
import { EditorDeadlinesPage, type EditorActionResult } from '~/features/editor'
import { date, required } from './operations-route-utils'
import type { Route } from './+types/operations-deadlines'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const focusChapterId = new URL(request.url).searchParams.get('chapterId') ?? ''
  const focusRequestId = new URL(request.url).searchParams.get('requestId') ?? ''
  try {
    const response = focusChapterId ? await deadlineControllerList({ chapterId: focusChapterId }) : null
    return {
      items: response?.status === 200 ? response.data.items : [],
      focusChapterId,
      focusRequestId,
      hasError: false
    }
  } catch {
    return { items: [], focusChapterId, focusRequestId, hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    if (intent === 'createDeadline')
      await deadlineControllerCreate({
        chapterId: required(form, 'chapterId'),
        requestedDeadline: date(form, 'deadline'),
        reason: required(form, 'reason')
      })
    else if (intent === 'counterDeadline')
      await deadlineControllerCounter(
        { id: required(form, 'requestId') },
        { requestedDeadline: date(form, 'deadline'), reason: required(form, 'reason') }
      )
    else if (intent === 'agreeDeadline') await deadlineControllerAgree({ id: required(form, 'requestId') })
    else if (intent === 'rejectDeadline')
      await deadlineControllerReject({ id: required(form, 'requestId') }, { reason: required(form, 'reason') })
    else if (intent === 'withdrawDeadline') await deadlineControllerWithdraw({ id: required(form, 'requestId') })
    else if (intent === 'finalizeDeadline') await deadlineControllerFinalize({ id: required(form, 'requestId') })
    else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: 'operationCompleted' }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorDeadlinesPage {...loaderData} />
}
