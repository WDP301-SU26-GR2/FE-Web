import { useLoaderData, type ClientLoaderFunctionArgs } from 'react-router'
import { surveyControllerGetBoardRanking, surveyControllerGetSurveyPeriods } from '~/api/operations/survey/survey'
import { AdminReferenceRankingPage } from '~/features/admin'

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const search = new URL(request.url).searchParams
  const surveyPeriodId = clean(search.get('surveyPeriodId'))
  const returnTo = safeReturnTo(search.get('returnTo'))
  const periods = await settle(surveyControllerGetSurveyPeriods())
  const boardRanking = surveyPeriodId ? await settle(surveyControllerGetBoardRanking({ surveyPeriodId })) : null

  return {
    periods: periods?.items ?? [],
    selected: { surveyPeriodId, returnTo },
    rankingData: { boardRanking }
  }
}

async function settle<T>(promise: Promise<{ data: T } | { data: void }>): Promise<T | null> {
  try {
    const data = (await promise).data
    return data === undefined ? null : (data as T)
  } catch {
    return null
  }
}

function clean(value: string | null) {
  return value?.trim() ?? ''
}

function safeReturnTo(value: string | null) {
  const target = clean(value)
  return target.startsWith('/dashboard/admin') ? target : '/dashboard/admin/operations/reference'
}

export default function RouteComponent() {
  const loaderData = useLoaderData<typeof clientLoader>()
  return <AdminReferenceRankingPage {...loaderData} />
}
