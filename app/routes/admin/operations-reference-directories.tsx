import { useLoaderData, type ClientLoaderFunctionArgs } from 'react-router'
import { usersControllerListAssistants, usersControllerListMangakas } from '~/api/operations/users/users'
import { AdminReferenceDirectoriesPage } from '~/features/admin'
import { loadAllOffsetItems } from '~/shared/lib/api/load-all-offset-items'

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const search = new URL(request.url).searchParams
  const returnTo = safeReturnTo(search.get('returnTo'))
  const [assistants, mangakas] = await Promise.all([
    loadAllOffsetItems((pagination) => usersControllerListAssistants(pagination).then((response) => response.data)),
    loadAllOffsetItems((pagination) => usersControllerListMangakas(pagination).then((response) => response.data))
  ])

  return {
    directories: { assistants, mangakas },
    selected: { returnTo }
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
  return <AdminReferenceDirectoriesPage {...loaderData} />
}
