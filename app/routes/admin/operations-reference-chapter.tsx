import { useLoaderData, type ClientLoaderFunctionArgs } from 'react-router'
import { chapterControllerListPages, chapterControllerProgress } from '~/api/operations/chapters/chapters'
import { productionStageControllerList } from '~/api/operations/production-stages/production-stages'
import { AdminReferenceChapterPage } from '~/features/admin'

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const search = new URL(request.url).searchParams
  const chapterId = clean(search.get('chapterId'))
  const chapterNameId = clean(search.get('chapterNameId'))
  const returnTo = safeReturnTo(search.get('returnTo'))

  const [pages, progress, stages] = chapterId
    ? await Promise.all([
        settle(chapterControllerListPages({ id: chapterId })),
        settle(chapterControllerProgress({ id: chapterId })),
        settle(productionStageControllerList({ id: chapterId }))
      ])
    : [null, null, null]

  return {
    selected: { chapterId, chapterNameId, returnTo },
    chapterData: { pages, progress, stages }
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
  return <AdminReferenceChapterPage {...loaderData} />
}
