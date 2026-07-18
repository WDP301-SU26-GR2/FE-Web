import { auditControllerList } from '~/api/operations/audit/audit'
import { BoardAuditPage } from '~/features/board'
import type { AuditControllerListParams } from '~/api/model/audit'
import type { Route } from './+types/audit'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const search = new URL(request.url).searchParams
  const params: AuditControllerListParams = {
    entityId: search.get('entityId') || undefined,
    actorId: search.get('actorId') || undefined,
    action: search.get('action') || undefined,
    limit: 50,
    offset: 0
  }
  try {
    const response = await auditControllerList(params)
    return { data: response.status === 200 ? response.data : null, hasError: response.status !== 200 }
  } catch {
    return { data: null, hasError: true }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardAuditPage {...loaderData} />
}
