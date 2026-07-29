import { boardControllerGetDecisionDetails, boardControllerGetSessionById } from '~/api/operations/board/board'
import { chapterControllerGetOne } from '~/api/operations/chapters/chapters'
import { contractControllerGetContractById } from '~/api/operations/contracts/contracts'
import { deadlineControllerGetOne } from '~/api/operations/deadline-requests/deadline-requests'
import { paymentControllerGetPaymentById } from '~/api/operations/payments/payments'
import { publicationControllerGetOne } from '~/api/operations/publication-versions/publication-versions'
import { reprintRequestControllerFindById } from '~/api/operations/reprint-requests/reprint-requests'
import { seriesControllerGetSeries } from '~/api/operations/series/series'
import { surveyControllerGetSurveyPeriodById } from '~/api/operations/survey/survey'
import { taskControllerGetTask } from '~/api/operations/task/task'
import { transferControllerGetTransferRequestById } from '~/api/operations/transfer/transfer'
import { usersControllerGetUser } from '~/api/operations/users/users'

import type { AuditReference } from '~/features/admin/audit/admin-audit-page'

type AuditItem = {
  actorId: string | null
  entityId: string
  entityType: string
}

type UnknownRecord = Record<string, unknown>
type UnresolvedAuditReference = Omit<AuditReference, 'title'> & { title?: string }

export async function resolveAuditReferences(items: AuditItem[]) {
  const actorIds = unique(items.flatMap((item) => (item.actorId ? [item.actorId] : [])))
  const entityKeys = unique(items.map((item) => `${item.entityType}:${item.entityId}`))

  const [actorEntries, entityEntries] = await Promise.all([
    mapInBatches(actorIds, 6, async (id) => [id, await resolveUser(id)] as const),
    mapInBatches(entityKeys, 6, async (key) => {
      const separator = key.indexOf(':')
      const entityType = key.slice(0, separator)
      const entityId = key.slice(separator + 1)
      return [key, await resolveEntity(entityType, entityId)] as const
    })
  ])

  return {
    actors: compactEntries(actorEntries),
    entities: compactEntries(entityEntries)
  }
}

async function resolveUser(id: string): Promise<AuditReference | null> {
  return settleReference(async () => {
    const { data } = await usersControllerGetUser({ id })
    return {
      title: data.displayName || data.name || data.email,
      subtitle: data.displayName || data.name ? data.email : undefined,
      href: `/dashboard/admin/users/${id}`
    }
  })
}

async function resolveEntity(entityType: string, id: string): Promise<AuditReference | null> {
  switch (entityType) {
    case 'USER':
      return resolveUser(id)
    case 'SERIES':
      return resolveApiReference(
        () => seriesControllerGetSeries({ id }),
        (data) => ({
          title: stringValue(data, 'title'),
          subtitle: stringValue(data, 'magazine'),
          href: `/dashboard/admin/operations/reference?seriesId=${encodeURIComponent(id)}`
        })
      )
    case 'CHAPTER':
      return resolveApiReference(
        () => chapterControllerGetOne({ id }),
        (data) => {
          const number = numberValue(data, 'chapterNumber')
          const title = stringValue(data, 'title')
          return {
            title: [number === null ? null : `#${number}`, title].filter(Boolean).join(' · '),
            subtitle: stringValue(data, 'status'),
            href: `/dashboard/admin/operations/reference?chapterId=${encodeURIComponent(id)}`
          }
        }
      )
    case 'TASK':
      return resolveApiReference(
        () => taskControllerGetTask({ id }),
        (data) => ({
          title: stringValue(data, 'groupTitle') || stringValue(data, 'description') || stringValue(data, 'taskType'),
          subtitle: stringValue(data, 'status')
        })
      )
    case 'DEADLINE_REQUEST':
      return resolveApiReference(
        () => deadlineControllerGetOne({ id }),
        (data) => ({
          title: nestedString(data, 'series', 'title') || nestedChapterLabel(data),
          subtitle: stringValue(data, 'status'),
          href: `/dashboard/admin/operations/reference?deadlineId=${encodeURIComponent(id)}`
        })
      )
    case 'CONTRACT':
      return resolveApiReference(
        () => contractControllerGetContractById({ id }),
        (data) => ({
          title: nestedString(data, 'series', 'title') || stringValue(data, 'contractType'),
          subtitle: stringValue(data, 'status')
        })
      )
    case 'BOARD_DECISION':
      return resolveApiReference(
        () => boardControllerGetDecisionDetails({ id }),
        (data) => ({
          title: nestedString(data, 'targetSeries', 'title') || stringValue(data, 'decisionType'),
          subtitle: stringValue(data, 'result'),
          href: `/dashboard/admin/board/decisions/${id}`
        })
      )
    case 'BOARD_SESSION':
      return resolveApiReference(
        () => boardControllerGetSessionById({ id }),
        (data) => ({
          title: stringValue(data, 'title'),
          subtitle: stringValue(data, 'status'),
          href: `/dashboard/admin/board/sessions/${id}`
        })
      )
    case 'REPRINT_REQUEST':
      return resolveApiReference(
        () => reprintRequestControllerFindById({ id }),
        (data) => ({
          title: nestedString(data, 'series', 'title'),
          subtitle: stringValue(data, 'status'),
          href: `/dashboard/admin/operations/reference?reprintId=${encodeURIComponent(id)}`
        })
      )
    case 'TRANSFER_REQUEST':
      return resolveApiReference(
        () => transferControllerGetTransferRequestById({ id }),
        (data) => ({
          title: nestedString(data, 'series', 'title'),
          subtitle: stringValue(data, 'status'),
          href: `/dashboard/admin/operations/reference?transferRequestId=${encodeURIComponent(id)}`
        })
      )
    case 'PAYMENT_RECORD':
      return resolveApiReference(
        () => paymentControllerGetPaymentById({ id }),
        (data) => ({
          title:
            stringValue(data, 'description') ||
            nestedString(data, 'series', 'title') ||
            nestedString(data, 'receiver', 'displayName'),
          subtitle: stringValue(data, 'status'),
          href: `/dashboard/admin/board/payments?paymentId=${encodeURIComponent(id)}`
        })
      )
    case 'SURVEY_PERIOD':
      return resolveApiReference(
        () => surveyControllerGetSurveyPeriodById({ id }),
        (data) => {
          const magazine = stringValue(data, 'magazine')
          const issue = numberValue(data, 'issueNumber')
          return {
            title: [magazine, issue === null ? null : `#${issue}`].filter(Boolean).join(' · '),
            subtitle: stringValue(data, 'status'),
            href: `/dashboard/admin/operations/surveys?surveyId=${encodeURIComponent(id)}`
          }
        }
      )
    case 'PUBLICATION_VERSION':
      return resolveApiReference(
        () => publicationControllerGetOne({ id }),
        (data) => ({
          title: [stringValue(data, 'language'), stringValue(data, 'versionType')].filter(Boolean).join(' · '),
          subtitle: stringValue(data, 'readingDirection'),
          href: `/dashboard/admin/operations/publication-versions?versionId=${encodeURIComponent(id)}`
        })
      )
    case 'APP_CONFIG':
      return null
    default:
      return null
  }
}

async function resolveApiReference(
  load: () => Promise<{ data: unknown }>,
  map: (data: UnknownRecord) => UnresolvedAuditReference
): Promise<AuditReference | null> {
  return settleReference(async () => {
    const response = await load()
    const data = asRecord(response.data)
    if (!data) return null
    const reference = map(data)
    return reference.title ? { ...reference, title: reference.title } : null
  })
}

async function settleReference(load: () => Promise<AuditReference | null>): Promise<AuditReference | null> {
  try {
    return await load()
  } catch {
    return null
  }
}

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' ? (value as UnknownRecord) : null
}

function stringValue(record: UnknownRecord, key: string) {
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value : undefined
}

function numberValue(record: UnknownRecord, key: string) {
  const value = record[key]
  return typeof value === 'number' ? value : null
}

function nestedString(record: UnknownRecord, parentKey: string, childKey: string) {
  const parent = asRecord(record[parentKey])
  return parent ? stringValue(parent, childKey) : undefined
}

function nestedChapterLabel(record: UnknownRecord) {
  const chapter = asRecord(record.chapter)
  if (!chapter) return undefined
  const number = numberValue(chapter, 'chapterNumber')
  const title = stringValue(chapter, 'title')
  return [number === null ? null : `#${number}`, title].filter(Boolean).join(' · ') || undefined
}

function unique(values: string[]) {
  return [...new Set(values)]
}

function compactEntries(entries: ReadonlyArray<readonly [string, AuditReference | null]>) {
  return Object.fromEntries(entries.filter((entry): entry is readonly [string, AuditReference] => entry[1] !== null))
}

async function mapInBatches<T, R>(values: T[], batchSize: number, map: (value: T) => Promise<R>) {
  const results: R[] = []
  for (let index = 0; index < values.length; index += batchSize) {
    const batch = await Promise.all(values.slice(index, index + batchSize).map(map))
    results.push(...batch)
  }
  return results
}
