import {
  boardControllerCreateSeriesReport,
  boardControllerCastVote,
  boardControllerGetDecisionDetails,
  boardControllerGetSessionById
} from '~/api/operations/board/board'
import { seriesControllerGetSeries } from '~/api/operations/series/series'
import { tankobonControllerDashboard } from '~/api/operations/tankobon/tankobon'
import type { SeriesResDtoOutput } from '~/api/model/series'
import type { DefenseDashboardResDtoOutput } from '~/api/model/tankobon'
import { readBoardSessionPhase } from '~/api/manual/board-meeting'
import { BoardDecisionDetailPage, type BoardActionResult } from '~/features/board'
import { loadBoardDecisionDetail } from '../board/decision-detail-loader'
import { extractApiErrorCode } from '~/shared/lib/api/extract-api-error'
import type { ClientActionFunctionArgs, ClientLoaderFunctionArgs } from 'react-router'
import i18n from '~/shared/lib/i18n'

export async function clientLoader({ params }: ClientLoaderFunctionArgs) {
  const id = requiredParam(params.id)
  return loadBoardDecisionDetail(id)
}

export async function clientAction({ request, params }: ClientActionFunctionArgs): Promise<BoardActionResult> {
  const id = requiredParam(params.id)
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'createReport') {
      const decision = await boardControllerGetDecisionDetails({ id })
      if (decision.status !== 200 || !decision.data.targetSeriesId) return { ok: false, intent }
      const session = await boardControllerGetSessionById({ id: decision.data.boardSessionId })
      if (session.status !== 200 || session.data.status === 'CONCLUDED') return { ok: false, intent }
      const note = String(form.get('content') ?? '').trim()
      const evidenceSections = readEvidenceSections(form)
      if (!note && evidenceSections.length === 0) {
        return { ok: false, intent }
      }
      const needsDashboard = evidenceSections.some((section) => section !== 'LIFECYCLE')
      const [series, defense] = await Promise.all([
        seriesControllerGetSeries({ id: decision.data.targetSeriesId }),
        needsDashboard
          ? tankobonControllerDashboard({ id: decision.data.targetSeriesId }).catch(() => null)
          : Promise.resolve(null)
      ])
      if (series.status !== 200) return { ok: false, intent }
      if (needsDashboard && defense?.status !== 200) {
        return { ok: false, intent }
      }
      const reportContent = buildReportContent(
        evidenceSections,
        note,
        series.data,
        defense?.status === 200 ? defense.data : null,
        String(form.get('reportLocale')) === 'en' ? 'en' : 'vi'
      )
      await boardControllerCreateSeriesReport({
        seriesId: decision.data.targetSeriesId,
        boardDecisionId: id,
        reportType: requiredValue(form, 'reportType'),
        content: reportContent,
        attachments: String(form.get('attachments') ?? '')
          .split(/[\n,]/)
          .map((item) => item.trim())
          .filter(Boolean)
      })
      return {
        ok: true,
        intent,
        messageKey: 'reportCreated'
      }
    }
    if (intent !== 'vote') return { ok: false, intent }
    const decision = await boardControllerGetDecisionDetails({ id })
    if (decision.status !== 200) return { ok: false, intent }
    const session = await boardControllerGetSessionById({ id: decision.data.boardSessionId })
    if (session.status !== 200 || session.data.status !== 'ACTIVE' || readBoardSessionPhase(session.data) !== 'VOTING')
      return { ok: false, intent }
    await boardControllerCastVote(
      { id },
      {
        voteValue: String(form.get('voteValue')) as 'APPROVE' | 'REJECT' | 'ABSTAIN',
        note: String(form.get('note') ?? '') || undefined
      }
    )
    return { ok: true, intent, messageKey: 'voteSubmitted' }
  } catch (error) {
    return { ok: false, intent, errorCode: extractApiErrorCode(error) }
  }
}

function requiredParam(value: string | undefined) {
  if (!value) throw new Response('Not found', { status: 404 })
  return value
}

export default function RouteComponent({ loaderData }: { loaderData: Awaited<ReturnType<typeof clientLoader>> }) {
  const seriesId = loaderData.decision.targetSeriesId
  const lifecycleHref = seriesId
    ? `/dashboard/editor/operations/lifecycle?seriesId=${encodeURIComponent(seriesId)}&decisionId=${encodeURIComponent(loaderData.decision.id)}`
    : undefined
  const resourceHref = contractResourceHref(loaderData.decision.details, loaderData.contractResourceParentId)

  return (
    <BoardDecisionDetailPage
      {...loaderData}
      canCreateReport
      lifecycleHref={lifecycleHref}
      resourceHref={resourceHref}
      backPath={`/dashboard/editor/board/sessions/${loaderData.decision.boardSessionId}`}
    />
  )
}

function contractResourceHref(
  details: Record<string, unknown> | null | undefined,
  contractResourceParentId: string | null
) {
  if (!details || typeof details.resourceId !== 'string') return undefined
  if (details.resourceType === 'PUBLICATION_CONTRACT' || details.resourceType === 'REPLACEMENT_CONTRACT')
    return `/dashboard/editor/contracts/${encodeURIComponent(details.resourceId)}`
  if (details.resourceType === 'TRANSFER_CONTRACT')
    return `/dashboard/editor/operations/transfers?contractId=${encodeURIComponent(details.resourceId)}`
  if (details.resourceType === 'CONTRACT_AMENDMENT' && contractResourceParentId)
    return `/dashboard/editor/contracts/${encodeURIComponent(contractResourceParentId)}?amendmentId=${encodeURIComponent(details.resourceId)}`
  return undefined
}

function requiredValue(form: FormData, key: string) {
  const value = String(form.get(key) ?? '').trim()
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

const evidenceSectionValues = ['LIFECYCLE', 'SERIALIZATION', 'SALES', 'RANKING'] as const
type EvidenceSection = (typeof evidenceSectionValues)[number]

function readEvidenceSections(form: FormData): EvidenceSection[] {
  const allowed = new Set<string>(evidenceSectionValues)
  return [
    ...new Set(
      form
        .getAll('evidenceSections')
        .map(String)
        .filter((value) => allowed.has(value))
    )
  ] as EvidenceSection[]
}

function buildReportContent(
  sections: EvidenceSection[],
  note: string,
  series: SeriesResDtoOutput,
  defense: DefenseDashboardResDtoOutput | null,
  locale: 'en' | 'vi'
) {
  const t = i18n.getFixedT(locale, 'editor')
  const labels = {
    series: t('board.reportSnapshot.series'),
    lifecycle: t('board.reportSnapshot.lifecycle'),
    currentStatus: t('board.reportSnapshot.currentStatus'),
    latestReason: t('board.reportSnapshot.latestReason'),
    none: t('board.reportSnapshot.none'),
    cadence: t('board.reportSnapshot.cadence'),
    magazine: t('board.reportSnapshot.magazine'),
    startIssue: t('board.reportSnapshot.startIssue'),
    notAvailable: t('board.reportSnapshot.notAvailable'),
    serialization: t('board.reportSnapshot.serialization'),
    publishedChapters: t('board.reportSnapshot.publishedChapters'),
    serializedSince: t('board.reportSnapshot.serializedSince'),
    volume: t('board.reportSnapshot.volume'),
    units: t('board.reportSnapshot.units'),
    sales: t('board.reportSnapshot.sales'),
    totalUnits: t('board.reportSnapshot.totalUnits'),
    volumeCount: t('board.reportSnapshot.volumeCount'),
    recentVolumes: t('board.reportSnapshot.recentVolumes'),
    rank: t('board.reportSnapshot.rank'),
    votes: t('board.reportSnapshot.votes'),
    change: t('board.reportSnapshot.change'),
    risk: t('board.reportSnapshot.risk'),
    ranking: t('board.reportSnapshot.ranking'),
    editorialAnalysis: t('board.reportSnapshot.editorialAnalysis')
  }
  const missing = labels.notAvailable
  const blocks = [`${labels.series}: ${series.title}`]

  if (sections.includes('LIFECYCLE')) {
    blocks.push(
      [
        `## ${labels.lifecycle}`,
        `- ${labels.currentStatus}: ${t(`common:businessData.values.${series.status}`, {
          defaultValue: series.status
        })}`,
        `- ${labels.latestReason}: ${series.statusReason || labels.none}`,
        `- ${labels.cadence}: ${
          series.publicationType
            ? t(`common:businessData.values.${series.publicationType}`, { defaultValue: series.publicationType })
            : missing
        }`,
        `- ${labels.magazine}: ${series.magazine || missing}`,
        `- ${labels.startIssue}: ${series.startIssueNumber ?? missing}`
      ].join('\n')
    )
  }

  if (sections.includes('SERIALIZATION')) {
    blocks.push(
      defense
        ? [
            `## ${labels.serialization}`,
            `- ${labels.publishedChapters}: ${defense.serialization.chaptersPublished}`,
            `- ${labels.serializedSince}: ${defense.serialization.serializedSince || missing}`
          ].join('\n')
        : `## ${labels.serialization}\n- ${missing}`
    )
  }

  if (sections.includes('SALES')) {
    const recentVolumes = defense?.tankobon.volumes
      .slice(-5)
      .map(
        (volume) => `- ${labels.volume} ${volume.volumeNumber}: ${volume.unitsSold} ${labels.units} (${volume.period})`
      )
    blocks.push(
      defense
        ? [
            `## ${labels.sales}`,
            `- ${labels.totalUnits}: ${defense.tankobon.totalUnitsSold}`,
            `- ${labels.volumeCount}: ${defense.tankobon.volumes.length}`,
            ...(recentVolumes?.length ? [`- ${labels.recentVolumes}:`, ...recentVolumes] : [])
          ].join('\n')
        : `## ${labels.sales}\n- ${missing}`
    )
  }

  if (sections.includes('RANKING')) {
    const rankingLines = defense?.rankingTrend
      .slice(-5)
      .map(
        (item) =>
          `- ${item.recordedAt}: ${labels.rank} ${item.rankPosition ?? '—'}, ${item.voteCount} ${labels.votes}, ${labels.change} ${item.rankChange ?? '—'}, ${labels.risk} ${t(`common:businessData.values.${item.riskLevel}`, { defaultValue: item.riskLevel })}`
      )
    blocks.push(
      rankingLines?.length ? [`## ${labels.ranking}`, ...rankingLines].join('\n') : `## ${labels.ranking}\n- ${missing}`
    )
  }

  if (note) blocks.push(`## ${labels.editorialAnalysis}\n${note}`)
  return blocks.join('\n\n').slice(0, 5000)
}
