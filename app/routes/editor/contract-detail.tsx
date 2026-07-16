import { EditorContractDetailPage } from '~/features/editor'
import { loadContractBase } from './contract-route-utils'
import type { Route } from './+types/contract-detail'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const base = await loadContractBase(params.id)
  return { ...base, conditions: [], versions: [], amendments: [] }
}

export default function EditorContractDetailRoute({ loaderData }: Route.ComponentProps) {
  return <EditorContractDetailPage data={loaderData} />
}
