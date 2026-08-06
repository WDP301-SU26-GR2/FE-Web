import {
  reprintRequestControllerApproveChapter,
  reprintRequestControllerAssignReviser,
  reprintRequestControllerCreate,
  reprintRequestControllerFindAll,
  reprintRequestControllerFindById
} from '~/api/operations/reprint-requests/reprint-requests'
import { usersControllerListMangakas } from '~/api/operations/users/users'
import { chapterControllerListBySeries } from '~/api/operations/chapters/chapters'
import { contractControllerGetContracts } from '~/api/operations/contracts/contracts'
import { EditorReprintsPage, type EditorActionResult } from '~/features/editor'
import { loadOperationalSeries, required } from './operations-route-utils'
import type { Route } from './+types/operations-reprints'
import { AssignReviserBodyDtoReviserType, CreateReprintRequestBodyDtoRevisionMode } from '~/api/model/reprint-requests'
import { isEnumValue } from '~/shared/lib/is-enum-value'
import { mapWithConcurrency } from '~/shared/lib/api/map-with-concurrency'

const DETAIL_REQUEST_CONCURRENCY = 6

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const focusRequestId = new URL(request.url).searchParams.get('requestId') ?? ''
  try {
    const [series, mangakasResponse, contractsResponse] = await Promise.all([
      loadOperationalSeries(),
      usersControllerListMangakas({ limit: 100, offset: 0 }),
      contractControllerGetContracts()
    ])
    const reprintResponse = await listAllReprints()
    const reprintList = reprintResponse.data
    const reprints = await mapWithConcurrency(reprintList, DETAIL_REQUEST_CONCURRENCY, async (item) => {
      const detail = await reprintRequestControllerFindById({ id: item.id }).catch(() => null)
      return detail?.status === 200 ? detail.data : null
    })
    const chapterResponses = await mapWithConcurrency(series, DETAIL_REQUEST_CONCURRENCY, (item) =>
      chapterControllerListBySeries({ seriesId: item.id })
    )
    return {
      series,
      chapters: chapterResponses.flatMap((response) => response.data.items),
      reprints: reprints.filter((item) => item != null),
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
      if (
        !Number.isInteger(chapterRangeStart) ||
        !Number.isInteger(chapterRangeEnd) ||
        chapterRangeStart <= 0 ||
        chapterRangeEnd < chapterRangeStart
      )
        return { ok: false, intent, errorKey: 'invalidChapterRange' }
      const revisionMode = required(form, 'revisionMode')
      if (!isEnumValue(CreateReprintRequestBodyDtoRevisionMode, revisionMode))
        return { ok: false, intent, errorKey: 'invalidAction' }
      await reprintRequestControllerCreate({
        seriesId: required(form, 'seriesId'),
        revisionMode,
        reason: required(form, 'reason'),
        chapterRangeStart,
        chapterRangeEnd
      })
    } else if (intent === 'approveReprintChapter' || intent === 'requestReprintRevision')
      await reprintRequestControllerApproveChapter(
        { id: required(form, 'reprintId'), chapterId: required(form, 'reprintChapterId') },
        { originalChapterId: required(form, 'reprintChapterId'), approve: intent === 'approveReprintChapter' }
      )
    else if (intent === 'assignReviser') {
      const reviserType = required(form, 'reviserType')
      if (!isEnumValue(AssignReviserBodyDtoReviserType, reviserType))
        return { ok: false, intent, errorKey: 'invalidAction' }
      await reprintRequestControllerAssignReviser(
        { id: required(form, 'reprintId'), chapterId: required(form, 'reprintChapterId') },
        {
          reviserId: required(form, 'reviserId'),
          reviserType
        }
      )
    } else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: intent }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

function listAllReprints() {
  // Swagger currently marks both filters as required although the endpoint and URL builder allow them to be omitted.
  return reprintRequestControllerFindAll({
    status: undefined as unknown as string,
    seriesId: undefined as unknown as string
  })
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorReprintsPage {...loaderData} />
}
