import { useLoaderData, type ClientLoaderFunctionArgs, type ClientActionFunctionArgs } from 'react-router'
import { usersControllerListAssistants, usersControllerListMangakas } from '~/api/operations/users/users'
import { AdminReferenceDirectoriesPage } from '~/features/admin'

const DEFAULT_LIMIT = 12

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const search = new URL(request.url).searchParams
  const returnTo = safeReturnTo(search.get('returnTo'))
  const page = Math.max(1, parseInt(search.get('page') ?? '1', 10))
  const tab = search.get('tab') ?? 'mangakas'
  const searchQuery = search.get('q') ?? ''

  const limit = DEFAULT_LIMIT
  const offset = (page - 1) * limit

  const [mangakasResult, assistantsResult] = await Promise.all([
    tab === 'mangakas' || tab === 'all'
      ? usersControllerListMangakas({ q: searchQuery || undefined, limit, offset }).catch(() => null)
      : Promise.resolve(null),
    tab === 'assistants' || tab === 'all'
      ? usersControllerListAssistants({ q: searchQuery || undefined, limit, offset }).catch(() => null)
      : Promise.resolve(null)
  ])

  return {
    directories: {
      mangakas: mangakasResult?.data ?? { items: [], total: 0, limit, offset },
      assistants: assistantsResult?.data ?? { items: [], total: 0, limit, offset }
    },
    selected: { returnTo },
    pagination: { page, limit, totalMangakas: mangakasResult?.data?.total ?? 0, totalAssistants: assistantsResult?.data?.total ?? 0 },
    search: searchQuery,
    tab
  }
}

export async function clientAction({ request }: ClientActionFunctionArgs) {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  if (intent === 'search') {
    const q = String(form.get('q') ?? '').trim()
    const tab = String(form.get('tab') ?? 'mangakas')
    const url = new URL(request.url)
    url.searchParams.set('q', q)
    url.searchParams.set('tab', tab)
    url.searchParams.set('page', '1')
    return Response.redirect(url.toString(), 303)
  }
  return { ok: false }
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
