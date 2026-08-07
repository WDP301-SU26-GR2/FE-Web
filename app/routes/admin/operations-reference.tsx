import { useLoaderData, type ClientLoaderFunctionArgs } from 'react-router'

import { AdminReferencePage } from '~/features/admin'

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const search = new URL(request.url).searchParams
  const returnTo = safeReturnTo(search.get('returnTo'))

  return {
    selected: {
      returnTo
    }
  }
}

function clean(value: string | null) {
  return value?.trim() ?? ''
}

function safeReturnTo(value: string | null) {
  const target = clean(value)
  return target.startsWith('/dashboard/admin') ? target : '/dashboard/admin/operations'
}

export default function RouteComponent() {
  const loaderData = useLoaderData<typeof clientLoader>()
  return <AdminReferencePage {...loaderData} />
}
