import { isFetchError } from '~/api/mutator/custom-fetch'
import { taskControllerGetTask } from '~/api/operations/task/task'
import { MangakaTaskDetailPage } from '~/features/mangaka'

export async function clientLoader({ params }: { params: { id: string } }) {
  try {
    const response = await taskControllerGetTask({ id: params.id })
    return { task: response.data, errorKey: null }
  } catch (error: unknown) {
    const errorKey =
      isFetchError(error) && error.status === 404 ? 'tasks.detail.errors.notFound' : 'tasks.detail.errors.generic'
    return { task: null, errorKey }
  }
}

export default function MangakaTaskDetailRoute({
  loaderData
}: {
  loaderData: Awaited<ReturnType<typeof clientLoader>>
}) {
  return <MangakaTaskDetailPage {...loaderData} />
}
