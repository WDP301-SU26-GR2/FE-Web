import {
  reprintRequestControllerApproveChapter,
  reprintRequestControllerAssignReviser,
  reprintRequestControllerCreate,
  reprintRequestControllerFindAll
} from '~/api/operations/reprint-requests/reprint-requests'
import { EditorReprintsPage, type EditorActionResult } from '~/features/editor'
import { loadOperationalSeries, required } from './operations-route-utils'
import type { Route } from './+types/operations-reprints'

export async function clientLoader() {
  try {
    const [series, response] = await Promise.all([
      loadOperationalSeries(),
      reprintRequestControllerFindAll({
        status: undefined as unknown as string,
        seriesId: undefined as unknown as string
      })
    ])
    return { series, reprints: response.data, hasError: false }
  } catch {
    return { series: [], reprints: [], hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    if (intent === 'createReprint')
      await reprintRequestControllerCreate({
        seriesId: required(form, 'seriesId'),
        revisionMode: required(form, 'revisionMode') as 'AS_IS' | 'WITH_REVISION',
        reason: required(form, 'reason'),
        chapterRangeStart: Number(required(form, 'chapterStart')),
        chapterRangeEnd: Number(required(form, 'chapterEnd'))
      })
    else if (intent === 'approveReprintChapter')
      await reprintRequestControllerApproveChapter(
        { id: required(form, 'reprintId'), chapterId: required(form, 'reprintChapterId') },
        { originalChapterId: required(form, 'originalChapterId'), approve: true }
      )
    else if (intent === 'assignReviser')
      await reprintRequestControllerAssignReviser(
        { id: required(form, 'reprintId'), chapterId: required(form, 'reprintChapterId') },
        {
          reviserId: required(form, 'reviserId'),
          reviserType: required(form, 'reviserType') as 'INTERNAL_TEAM' | 'OTHER_MANGAKA'
        }
      )
    else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: 'operationCompleted' }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorReprintsPage {...loaderData} />
}
