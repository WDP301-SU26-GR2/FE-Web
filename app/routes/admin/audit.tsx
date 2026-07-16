import { auditControllerList } from '~/api/operations/audit/audit'
import type { AuditControllerListEntityType, AuditControllerListParams } from '~/api/model/audit'
import { AdminAuditPage } from '~/features/admin'

import type { Route } from './+types/audit'

const ENTITY_TYPES = [
  'SERIES',
  'MANUSCRIPT',
  'PAGE',
  'CHAPTER',
  'TASK',
  'DEADLINE_REQUEST',
  'USER',
  'REGION',
  'APP_CONFIG',
  'CONTRACT',
  'BOARD_DECISION',
  'REPRINT_REQUEST',
  'TRANSFER_REQUEST',
  'PAYMENT_RECORD',
  'SURVEY_PERIOD',
  'PUBLICATION_VERSION'
] as const

export function meta() {
  return [{ title: 'Audit Log - MangaStudio Pro' }]
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const searchParams = new URL(request.url).searchParams
  const page = Math.max(Number.parseInt(searchParams.get('page') ?? '1', 10) || 1, 1)
  const limit = 20
  const entityType = readEntityType(searchParams.get('entityType'))
  const params: AuditControllerListParams = {
    entityType,
    entityId: clean(searchParams.get('entityId')),
    actorId: clean(searchParams.get('actorId')),
    action: clean(searchParams.get('action')),
    limit,
    offset: (page - 1) * limit
  }
  try {
    const response = await auditControllerList(params)
    if (response.status !== 200) return { data: null, hasError: true }
    return { data: response.data, hasError: false }
  } catch {
    return { data: null, hasError: true }
  }
}

export default function AdminAuditRoute({ loaderData }: Route.ComponentProps) {
  return <AdminAuditPage data={loaderData.data} hasError={loaderData.hasError} />
}

function clean(value: string | null) {
  return value?.trim() || undefined
}

function readEntityType(value: string | null): AuditControllerListEntityType | undefined {
  return value && ENTITY_TYPES.includes(value as (typeof ENTITY_TYPES)[number])
    ? (value as AuditControllerListEntityType)
    : undefined
}
