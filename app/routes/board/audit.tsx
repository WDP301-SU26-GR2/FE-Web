import { auditControllerList } from '~/api/operations/audit/audit'
import { BoardAuditPage } from '~/features/board'
import type { AuditControllerListParams } from '~/api/model/audit'
import { AuditControllerListEntityType } from '~/api/model/audit'
import { isEnumValue } from '~/shared/lib/is-enum-value'
import type { Route } from './+types/audit'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const search = new URL(request.url).searchParams
  const requestedEntityType = search.get('entityType') ?? ''
  const page = positiveInteger(search.get('page'))
  const limit = 25
  const params: AuditControllerListParams = {
    entityType: isEnumValue(AuditControllerListEntityType, requestedEntityType) ? requestedEntityType : undefined,
    entityId: search.get('entityId') || undefined,
    actorId: search.get('actorId') || undefined,
    action: search.get('action') || undefined,
    limit,
    offset: (page - 1) * limit
  }
  try {
    const response = await auditControllerList(params)
    return {
      data: response.status === 200 ? response.data : null,
      filters: {
        entityType: params.entityType ?? '',
        entityId: params.entityId ?? '',
        actorId: params.actorId ?? '',
        action: params.action ?? ''
      },
      page,
      hasError: response.status !== 200
    }
  } catch {
    return { data: null, filters: { entityType: '', entityId: '', actorId: '', action: '' }, page, hasError: true }
  }
}

function positiveInteger(value: string | null) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardAuditPage {...loaderData} />
}
