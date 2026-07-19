import {
  reprintRequestControllerApproveChapter,
  reprintRequestControllerAssignReviser,
  reprintRequestControllerCreate,
  reprintRequestControllerFindAll
} from '~/api/operations/reprint-requests/reprint-requests'
import { usersControllerListMangakas } from '~/api/operations/users/users'
import { chapterControllerListBySeries } from '~/api/operations/chapters/chapters'
import { contractControllerGetContracts } from '~/api/operations/contracts/contracts'
import { EditorReprintsPage, type EditorActionResult } from '~/features/editor'
import { loadOperationalSeries, required } from './operations-route-utils'
import type { Route } from './+types/operations-reprints'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const focusRequestId = new URL(request.url).searchParams.get('requestId') ?? ''
  try {
    const [series, mangakasResponse, contractsResponse] = await Promise.all([
      loadOperationalSeries(),
      usersControllerListMangakas({ limit: 100, offset: 0 }),
      contractControllerGetContracts()
    ])
    const responses = await Promise.all(
      series.map((item) =>
        reprintRequestControllerFindAll({
          status: undefined as unknown as string,
          seriesId: item.id
        })
      )
    )
    const reprints = Array.from(
      new Map(responses.flatMap((response) => response.data).map((item) => [item.id, item])).values()
    )
    const chapterResponses = await Promise.all(series.map((item) => chapterControllerListBySeries({ seriesId: item.id })))
    return {
      series,
      chapters: chapterResponses.flatMap((response) => response.data.items),
      reprints,
      mangakas: mangakasResponse.data.items,
      contractTypes: Object.fromEntries(
        contractsResponse.data
          .filter((contract) => contract.status === 'FULLY_EXECUTED')
          .map((contract) => [contract.seriesId, contract.contractType])
      ),
      focusRequestId,
      hasError: false
    }
  } catch {
    return { series: [], chapters: [], reprints: [], mangakas: [], contractTypes: {}, focusRequestId, hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    if (intent === 'createReprint') {
      const chapterRangeStart = Number(required(form, 'chapterStart'))
      const chapterRangeEnd = Number(required(form, 'chapterEnd'))
      if (!Number.isInteger(chapterRangeStart) || !Number.isInteger(chapterRangeEnd) || chapterRangeStart < 0 || chapterRangeEnd < chapterRangeStart)
        return { ok: false, intent, errorKey: 'invalidChapterRange' }
      await reprintRequestControllerCreate({
        seriesId: required(form, 'seriesId'),
        revisionMode: required(form, 'revisionMode') as 'AS_IS' | 'WITH_REVISION',
        reason: required(form, 'reason'),
        chapterRangeStart,
        chapterRangeEnd
      })
    } else if (intent === 'approveReprintChapter' || intent === 'requestReprintRevision')
      await reprintRequestControllerApproveChapter(
        { id: required(form, 'reprintId'), chapterId: required(form, 'reprintChapterId') },
        { originalChapterId: required(form, 'reprintChapterId'), approve: intent === 'approveReprintChapter' }
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
  } catch (error) {
    return { ok: false, intent, message: extractApiErrorMessage(error, 'Không thể hoàn tất thao tác tái bản.') }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorReprintsPage {...loaderData} />
}
